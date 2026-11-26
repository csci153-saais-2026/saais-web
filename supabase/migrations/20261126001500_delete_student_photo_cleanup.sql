-- Track private student photo objects cleared by deleteStudentPhoto so the
-- trusted Edge Function can remove them after commit without racing against a
-- concurrent upload that references a newer or matching avatar.
create table saais_private.deleted_student_photo (
  object_path text primary key,
  student_id uuid not null,
  deleted_at timestamptz not null default clock_timestamp()
);
create index deleted_student_photo_student_idx
  on saais_private.deleted_student_photo (student_id, deleted_at);
revoke all on saais_private.deleted_student_photo from public, anon, authenticated;

create or replace function saais_private.matt_deletestudentphoto(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  profile public.profile := saais_private.matt_photo_target((p_params->>'student_id')::uuid);
  object_key text;
begin
  if profile.avatar_url is not null then
    object_key := split_part(split_part(profile.avatar_url, '?', 1), '/student-photos/', 2);
    if saais_private.student_photo_owner(object_key) = profile.id then
      insert into saais_private.deleted_student_photo(object_path, student_id)
        values (object_key, profile.id)
        on conflict (object_path) do update set deleted_at = clock_timestamp();
    end if;
    update public.profile p set avatar_url = null, updated_at = clock_timestamp() where p.id = profile.id;
    perform saais_private.audit('student_photo_deleted', 'profile', profile.id,
      jsonb_build_object('has_photo', true), jsonb_build_object('has_photo', false), profile.id);
  end if;
  return saais_private.matt_profile(profile.id);
end $$;

create function public.saais_reconcile_deleted_photos(
  p_student uuid,
  p_removed text[] default null
) returns text[]
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_current text;
  v_pending text[];
begin
  -- Serialize against concurrent profile photo writes and never return an
  -- object path still referenced by the student's current profile.
  select split_part(split_part(p.avatar_url, '?', 1), '/student-photos/', 2)
    into v_current
    from public.profile p
    where p.id = p_student and p.role = 'student'
    for share;
  if not found then
    return '{}'::text[];
  end if;
  if p_removed is not null and cardinality(p_removed) > 0 then
    delete from saais_private.deleted_student_photo
      where student_id = p_student and object_path = any(p_removed);
  end if;
  if v_current is not null and v_current <> '' then
    delete from saais_private.deleted_student_photo
      where student_id = p_student and object_path = v_current;
  end if;
  select coalesce(array_agg(d.object_path order by d.deleted_at, d.object_path), '{}'::text[])
    into v_pending
    from saais_private.deleted_student_photo d
    where d.student_id = p_student
      and saais_private.student_photo_owner(d.object_path) = p_student
      and d.object_path is distinct from v_current;
  return v_pending;
end $$;

revoke all on function public.saais_reconcile_deleted_photos(uuid, text[]) from public, anon, authenticated;
grant execute on function public.saais_reconcile_deleted_photos(uuid, text[]) to service_role;
