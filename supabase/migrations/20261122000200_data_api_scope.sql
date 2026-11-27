-- Row predicates shared by PostgREST projections and private Storage.
create function saais_private.can_read_department(
  p_department uuid, p_roles text[]
) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select saais_private.own_active_record(auth.uid()) and exists (
    select 1
    from public.role_assignment r
    left join public.department d on d.id = p_department
    where r.profile_id = auth.uid() and r.role::text = any(p_roles)
      and (r.role = 'admin'
        or (r.role in ('department_head', 'department_staff') and r.department_id = d.id)
        or (r.role = 'dean' and r.faculty_id = d.faculty_id))
  );
$$;

create function saais_private.can_read_student(
  p_student uuid, p_roles text[], p_historical boolean default true
) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select saais_private.own_active_record(auth.uid()) and exists (
    select 1
    from public.role_assignment r
    where r.profile_id = auth.uid() and r.role::text = any(p_roles)
      and (r.role = 'admin'
        or (r.role = 'student' and r.profile_id = p_student)
        or (r.role = 'adviser' and exists (
          select 1 from public.adviser_assignment a
          where a.student_id = p_student and a.adviser_id = r.profile_id
            and a.start_date <= (now() at time zone 'Asia/Manila')::date
            and (p_historical or a.end_date is null)
        ))
        or (r.role in ('department_head', 'department_staff', 'dean') and exists (
          select 1
          from public.student_curriculum_assignment a
          join public.curriculum_version v on v.id = a.curriculum_version_id
          join public.program p on p.id = v.program_id
          join public.department d on d.id = p.department_id
          where a.student_id = p_student and a.end_date is null
            and (r.department_id = d.id or (r.role = 'dean' and r.faculty_id = d.faculty_id))
        )))
  );
$$;

create function saais_private.can_read_profile(p_profile uuid, p_historical boolean) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select saais_private.own_active_record(p_profile)
    or saais_private.can_read_student(p_profile,
      array['adviser','department_head','department_staff','dean','admin'], p_historical)
    or exists (
      select 1 from public.profile p
      where p.id = p_profile and p.role <> 'student'
        and (saais_private.can_read_department(p.department_id, array['department_head','department_staff','dean'])
          or (p.faculty_id is not null and saais_private.own_active_record(auth.uid())
            and saais_private.has_role('dean', null, p.faculty_id)))
    );
$$;

create function saais_private.can_read_curriculum(p_version uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists (
    select 1 from public.curriculum_version v
    join public.program p on p.id = v.program_id
    where v.id = p_version
      and (saais_private.can_read_department(p.department_id, array['department_head','department_staff','dean','admin'])
        or exists (
          select 1 from public.student_curriculum_assignment a
          where a.curriculum_version_id = v.id
            and saais_private.can_read_student(a.student_id, array['student','adviser'])
        ))
  );
$$;

revoke all on function saais_private.can_read_department(uuid,text[]),
  saais_private.can_read_student(uuid,text[],boolean), saais_private.can_read_profile(uuid,boolean),
  saais_private.can_read_curriculum(uuid) from public, anon, authenticated;
grant execute on function saais_private.can_read_department(uuid,text[]),
  saais_private.can_read_student(uuid,text[],boolean), saais_private.can_read_profile(uuid,boolean),
  saais_private.can_read_curriculum(uuid) to authenticated;

-- Only the read schema publishes table-shaped resources. The public schema
-- retains the RPC entry points and the existing own-profile policy.
create schema saais_api;
revoke all on schema saais_api from public, anon, authenticated;
grant usage on schema saais_api to authenticated;
