-- Existing validated avatars remain readable. New browser writes use reserved
-- staging names, and authenticated clients cannot rename an object into one.
alter policy student_photo_insert_scope on storage.objects
  with check (bucket_id <> 'student-photos' or (
    saais_private.can_use_student_photo(name, true)
    and saais_private.is_single_use_student_photo_path(name)
  ));
alter policy student_photo_update_scope on storage.objects
  using (bucket_id <> 'student-photos')
  with check (bucket_id <> 'student-photos');

create or replace function public.saais_reconcile_pending_deleted_photos(
  p_limit integer default 100,
  p_removed text[] default null
) returns text[] language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_limit integer := greatest(0, least(coalesce(p_limit, 100), 500));
  v_pending text[];
begin
  if p_removed is not null and cardinality(p_removed) > 0 then
    delete from saais_private.deleted_student_photo where object_path = any(p_removed);
  end if;
  if v_limit = 0 then return '{}'::text[]; end if;

  -- Catch abandoned staging uploads even if the browser never called the
  -- application API. A reserved name cannot be reused after Storage removes it.
  insert into saais_private.deleted_student_photo(object_path, student_id)
    select o.name, p.id
    from storage.objects o
    join public.profile p on p.id = saais_private.student_photo_owner(o.name)
      and p.role = 'student'
    join saais_private.used_student_photo_upload_path u on u.object_path = o.name
    where o.bucket_id = 'student-photos'
      and o.created_at < statement_timestamp() - interval '24 hours'
      and not exists (select 1 from saais_private.deleted_student_photo d
        where d.object_path = o.name)
      and not exists (select 1 from saais_private.verified_student_photo v
        where v.staging_path = o.name and v.expires_at > statement_timestamp())
      and not exists (select 1 from public.profile current_photo
        where split_part(split_part(current_photo.avatar_url, '?', 1), '/student-photos/', 2) = o.name)
    order by o.created_at, o.name
    limit v_limit
    on conflict (object_path) do nothing;

  perform 1 from public.profile p
    where p.id in (select d.student_id from saais_private.deleted_student_photo d)
    order by p.id for share;

  delete from saais_private.deleted_student_photo d
    where exists (select 1 from public.profile p
      where split_part(split_part(p.avatar_url, '?', 1), '/student-photos/', 2) = d.object_path);

  select coalesce(array_agg(batch.object_path order by batch.deleted_at, batch.object_path), '{}'::text[])
    into v_pending
    from (
      select d.object_path, d.deleted_at
      from saais_private.deleted_student_photo d
      where saais_private.student_photo_owner(d.object_path) = d.student_id
        and not exists (select 1 from saais_private.verified_student_photo v
          where v.staging_path = d.object_path and v.expires_at > statement_timestamp())
      order by d.deleted_at, d.object_path
      limit v_limit
    ) as batch;
  return v_pending;
end $$;
