-- Browser uploads are staging objects. Only the trusted Edge Function may
-- create immutable validated objects and authorize their use as profile photos.
update storage.buckets set file_size_limit = 5242880 where id = 'student-photos';
-- Preserve the pinned snapshot while applying the explicit 5 MiB contract change.
update saais_private.matt_contract
  set document = jsonb_set(jsonb_set(document,
    '{schemas,StudentPhotoUpdateRequest,properties,file_size_bytes,maximum}', '5242880'::jsonb),
    '{schemas,StudentPhotoUpdateRequest,properties,file_size_bytes,description}', to_jsonb('File size in bytes; maximum 5 MiB (5,242,880 bytes).'::text))
  where id;
update saais_private.contract
  set document = jsonb_set(jsonb_set(document,
    '{schemas,StudentPhotoUpdateRequest,properties,file_size_bytes,maximum}', '5242880'::jsonb),
    '{schemas,StudentPhotoUpdateRequest,properties,file_size_bytes,description}', to_jsonb('File size in bytes; maximum 5 MiB (5,242,880 bytes).'::text))
  where id;
create table saais_private.verified_student_photo (
  object_path text primary key,
  student_id uuid not null,
  actor_id uuid not null,
  expires_at timestamptz not null default (clock_timestamp() + interval '5 minutes')
);
revoke all on saais_private.verified_student_photo from public, anon, authenticated;

create or replace function saais_private.can_use_student_photo(p_path text, p_write boolean) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select (not p_write or split_part(p_path, '/', 3) !~ '^validated-')
    and exists (
      select 1 from public.profile p
      where p.id = saais_private.student_photo_owner(p_path) and p.role = 'student'
        and saais_private.can_read_student(p.id,
          case when p_write then array['student', 'admin']
            else array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin'] end,
          false)
    );
$$;

create function public.saais_photo_upload_authorize(p_student uuid, p_path text) returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
declare caller uuid; budget integer;
begin
  caller := saais_private.actor();
  perform saais_private.matt_photo_target(p_student);
  if saais_private.student_photo_owner(p_path) is distinct from p_student
    or split_part(p_path, '/', 3) ~ '^validated-' then
    perform saais_private.fail(400, 'Invalid staging photo path.');
  end if;
  insert into saais_private.request_budget(actor_id, window_start, count)
    values(caller, date_trunc('minute', now()), 1)
    on conflict(actor_id, window_start) do update set count = request_budget.count + 1
    returning count into budget;
  if budget > 120 then perform saais_private.fail(429, 'Request budget exceeded. Retry after 60 seconds.'); end if;
  return true;
end $$;
revoke all on function public.saais_photo_upload_authorize(uuid, text) from public, anon, authenticated;
grant execute on function public.saais_photo_upload_authorize(uuid, text) to authenticated;

create function public.saais_register_verified_photo(p_student uuid, p_actor uuid, p_path text) returns void
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if saais_private.student_photo_owner(p_path) is distinct from p_student
    or split_part(p_path, '/', 3) !~ '^validated-[0-9a-f-]{36}\.(png|jpg)$'
    or not exists (select 1 from storage.objects where bucket_id = 'student-photos' and name = p_path) then
    raise exception 'Invalid validated photo object';
  end if;
  delete from saais_private.verified_student_photo where expires_at < clock_timestamp();
  insert into saais_private.verified_student_photo(object_path, student_id, actor_id)
    values (p_path, p_student, p_actor);
end $$;
revoke all on function public.saais_register_verified_photo(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.saais_register_verified_photo(uuid, uuid, text) to service_role;

create or replace function saais_private.matt_uploadstudentphoto(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  profile public.profile := saais_private.matt_photo_target((p_params->>'student_id')::uuid);
  object_key text := p_body->>'storage_object_path';
  object_metadata jsonb;
  avatar text := '/storage/v1/object/authenticated/student-photos/' || object_key;
begin
  delete from saais_private.verified_student_photo
    where object_path = object_key and student_id = profile.id and actor_id = auth.uid()
      and expires_at > clock_timestamp();
  if not found then perform saais_private.fail(400, 'Photo validation is required.'); end if;
  if saais_private.student_photo_owner(object_key) is distinct from profile.id
    or split_part(object_key, '/', 3) !~ '^validated-[0-9a-f-]{36}\.(png|jpg)$'
    or split_part(split_part(p_body->>'avatar_url','?',1),'/student-photos/',2) <> object_key then
    perform saais_private.fail(400, 'Provide the validated photo object path and its URL.');
  end if;
  select metadata into object_metadata from storage.objects
    where bucket_id = 'student-photos' and name = object_key for share;
  if object_metadata is null or object_metadata->>'mimetype' is distinct from p_body->>'mime_type'
    or object_metadata->>'size' is distinct from p_body->>'file_size_bytes' then
    perform saais_private.fail(400, 'Stored photo metadata does not match the request.');
  end if;
  update public.profile p set avatar_url = avatar, updated_at = clock_timestamp() where p.id = profile.id;
  perform saais_private.audit('student_photo_updated','profile',profile.id,
    jsonb_build_object('has_photo',profile.avatar_url is not null),jsonb_build_object('has_photo',true),profile.id);
  return saais_private.matt_profile(profile.id);
end $$;
