create function saais_private.matt_listaccounts(p_params jsonb,p_body jsonb) returns jsonb
language sql stable set search_path=pg_catalog,public as $$
  with eligible as (
    select p.id,p.full_name,student.org
    from public.profile p
    cross join lateral (select case when p.role='student' then saais_private.organization(p.id) end org) student
    where (not p_params ? 'search' or strpos(lower(concat_ws(' ',p.full_name,p.email,p.student_number)),lower(p_params->>'search'))>0)
      and exists (
        select 1 from public.role_assignment r
        cross join lateral (select
          case when r.role='student' then (student.org->>'department_id')::uuid else r.department_id end department_id,
          case when r.role='student' then (student.org->>'faculty_id')::uuid
               else coalesce(r.faculty_id,(select d.faculty_id from public.department d where d.id=r.department_id)) end faculty_id
        ) scope
        where r.profile_id=p.id
          and (not p_params ? 'role' or r.role::text=p_params->>'role')
          and (not p_params ? 'department_id' or scope.department_id=(p_params->>'department_id')::uuid)
          and (not p_params ? 'faculty_id' or scope.faculty_id=(p_params->>'faculty_id')::uuid)
          and (
            saais_private.has_role('admin') or
            (scope.department_id is not null and (saais_private.has_role('department_head',scope.department_id)
              or saais_private.has_role('department_staff',scope.department_id))) or
            (scope.faculty_id is not null and saais_private.has_role('dean',null,scope.faculty_id))
          )
      )
    order by p.full_name,p.id
    limit coalesce((p_params->>'limit')::int,20) offset coalesce((p_params->>'offset')::int,0)
  )
  select coalesce(jsonb_agg(jsonb_build_object('profile',saais_private.matt_profile(e.id),
    'role_assignments',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id)
      from (select * from public.role_assignment r where r.profile_id=e.id order by r.created_at,r.id limit 6) r),'[]'),
    'student_organization',e.org) order by e.full_name,e.id),'[]')
  from eligible e;
$$;
