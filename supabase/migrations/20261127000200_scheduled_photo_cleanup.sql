-- Allow a scheduled background sweep to retry failed Storage removals across
-- all students without waiting for another photo operation on the same student.
create index deleted_student_photo_deleted_at_idx
  on saais_private.deleted_student_photo (deleted_at, object_path);

create function public.saais_reconcile_pending_deleted_photos(
  p_limit integer default 100,
  p_removed text[] default null
) returns text[]
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_limit integer := greatest(0, least(coalesce(p_limit, 100), 500));
  v_pending text[];
begin
  if p_removed is not null and cardinality(p_removed) > 0 then
    delete from saais_private.deleted_student_photo
      where object_path = any(p_removed);
  end if;

  if v_limit = 0 then
    return '{}'::text[];
  end if;

  -- Lock affected student profiles in deterministic ID order so concurrent
  -- photo writes finish before we inspect active avatar references.
  perform 1
    from public.profile p
    where p.id in (
      select distinct d.student_id
      from saais_private.deleted_student_photo d
    )
    order by p.id
    for share;

  -- Drop any stale queue rows that now match an active student avatar.
  delete from saais_private.deleted_student_photo d
    using public.profile p
    where p.id = d.student_id
      and p.role = 'student'
      and split_part(split_part(p.avatar_url, '?', 1), '/student-photos/', 2) = d.object_path;

  select coalesce(array_agg(batch.object_path order by batch.deleted_at, batch.object_path), '{}'::text[])
    into v_pending
    from (
      select d.object_path, d.deleted_at
      from saais_private.deleted_student_photo d
      left join public.profile p on p.id = d.student_id and p.role = 'student'
      where saais_private.student_photo_owner(d.object_path) = d.student_id
        and d.object_path is distinct from split_part(split_part(p.avatar_url, '?', 1), '/student-photos/', 2)
      order by d.deleted_at, d.object_path
      limit v_limit
    ) as batch;

  return v_pending;
end $$;

revoke all on function public.saais_reconcile_pending_deleted_photos(integer, text[]) from public, anon, authenticated;
grant execute on function public.saais_reconcile_pending_deleted_photos(integer, text[]) to service_role;
