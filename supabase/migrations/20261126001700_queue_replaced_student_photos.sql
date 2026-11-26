-- Keep staged uploads available until the matching profile write commits.
alter table saais_private.verified_student_photo add column staging_path text;

-- Each disposable staging key can name only one object, even after deletion.
create function saais_private.is_single_use_student_photo_path(p_path text) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select split_part(p_path, '/', 3) ~ '^upload-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg)$';
$$;
revoke all on function saais_private.is_single_use_student_photo_path(text) from public, anon, authenticated;
grant execute on function saais_private.is_single_use_student_photo_path(text) to authenticated;

create table saais_private.used_student_photo_upload_path (
  object_path text primary key
);
revoke all on saais_private.used_student_photo_upload_path from public, anon, authenticated;

create function saais_private.reserve_student_photo_upload_path() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if saais_private.is_single_use_student_photo_path(new.name) then
    insert into saais_private.used_student_photo_upload_path(object_path) values (new.name);
  end if;
  return new;
end $$;
revoke all on function saais_private.reserve_student_photo_upload_path() from public, anon, authenticated;

create trigger saais_reserve_student_photo_upload_path before insert on storage.objects
  for each row when (new.bucket_id = 'student-photos')
  execute function saais_private.reserve_student_photo_upload_path();

insert into saais_private.used_student_photo_upload_path(object_path)
  select distinct name from storage.objects
  where bucket_id = 'student-photos' and saais_private.is_single_use_student_photo_path(name);

alter policy student_photo_update_scope on storage.objects
  using (bucket_id <> 'student-photos' or (
    saais_private.can_use_student_photo(name, true)
    and not saais_private.is_single_use_student_photo_path(name)
  ))
  with check (bucket_id <> 'student-photos' or (
    saais_private.can_use_student_photo(name, true)
    and not saais_private.is_single_use_student_photo_path(name)
  ));

drop function public.saais_register_verified_photo(uuid, uuid, text);
create function public.saais_register_verified_photo(
  p_student uuid, p_actor uuid, p_path text, p_staging_path text default null
) returns void
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if saais_private.student_photo_owner(p_path) is distinct from p_student
    or split_part(p_path, '/', 3) !~ '^validated-[0-9a-f-]{36}\.(png|jpg)$'
    or not exists (select 1 from storage.objects where bucket_id = 'student-photos' and name = p_path) then
    raise exception 'Invalid validated photo object';
  end if;
  if p_staging_path is not null and (
    saais_private.student_photo_owner(p_staging_path) is distinct from p_student
    or split_part(p_staging_path, '/', 3) ~ '^validated-'
  ) then
    raise exception 'Invalid staging photo object';
  end if;
  delete from saais_private.verified_student_photo where expires_at < clock_timestamp();
  insert into saais_private.verified_student_photo(object_path, student_id, actor_id, staging_path)
    values (p_path, p_student, p_actor, p_staging_path);
end $$;
revoke all on function public.saais_register_verified_photo(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.saais_register_verified_photo(uuid, uuid, text, text) to service_role;

create or replace function saais_private.matt_uploadstudentphoto(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  profile public.profile := saais_private.matt_photo_target((p_params->>'student_id')::uuid);
  object_key text := p_body->>'storage_object_path';
  object_metadata jsonb;
  avatar text := '/storage/v1/object/authenticated/student-photos/' || object_key;
  staged_key text;
  previous_key text := split_part(split_part(profile.avatar_url, '?', 1), '/student-photos/', 2);
begin
  delete from saais_private.verified_student_photo
    where object_path = object_key and student_id = profile.id and actor_id = auth.uid()
      and expires_at > clock_timestamp()
    returning staging_path into staged_key;
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

  -- The profile lock gives us the actual previous avatar. Only queue paths
  -- that cannot name a newer upload by the time Storage removes them.
  insert into saais_private.deleted_student_photo(object_path, student_id)
    select distinct candidate, profile.id
    from unnest(array[previous_key, staged_key]) as paths(candidate)
    where saais_private.student_photo_owner(candidate) = profile.id and candidate <> object_key
      and (split_part(candidate, '/', 3) ~ '^validated-' or exists (
        select 1 from saais_private.used_student_photo_upload_path used where used.object_path = candidate
      ))
    on conflict (object_path) do nothing;

  update public.profile p set avatar_url = avatar, updated_at = clock_timestamp() where p.id = profile.id;
  perform saais_private.audit('student_photo_updated','profile',profile.id,
    jsonb_build_object('has_photo',profile.avatar_url is not null),jsonb_build_object('has_photo',true),profile.id);
  return saais_private.matt_profile(profile.id);
end $$;
