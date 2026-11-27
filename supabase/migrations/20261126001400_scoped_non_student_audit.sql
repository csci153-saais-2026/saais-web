-- Allow department heads and deans to read non-student catalog, term, settings,
-- and profile audit entries within their department or faculty scope, while
-- preserving cross-department, cross-faculty, adviser, and snapshot boundaries.
create function saais_private.can_read_audit_entry(p_id uuid) returns boolean
language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  r record;
  v_snap jsonb;
  v_dept uuid;
  v_fac uuid;
  v_ver uuid;
  v_ver2 uuid;
  v_course uuid;
  v_prog uuid;
  v_term uuid;
begin
  if not saais_private.own_active_record(auth.uid()) then
    return false;
  end if;
  select e.student_id, e.actor_id, e.entity_type, e.entity_id, e.old_value, e.new_value
    into r
    from public.audit_log_entry e
    where e.id = p_id;
  if not found then
    return false;
  end if;

  if saais_private.has_role('admin') then
    return true;
  end if;

  if r.student_id is not null then
    return saais_private.can_read_student(r.student_id, array['adviser', 'department_head', 'dean', 'admin']);
  end if;

  if saais_private.own_active_record(r.actor_id) and exists (
    select 1 from public.role_assignment a
    where a.profile_id = auth.uid() and a.role in ('adviser', 'department_head', 'dean')
  ) then
    return true;
  end if;

  if not exists (
    select 1 from public.role_assignment a
    where a.profile_id = auth.uid() and a.role in ('department_head', 'dean')
  ) then
    return false;
  end if;

  v_snap := coalesce(r.new_value, r.old_value, '{}'::jsonb);

  case r.entity_type
    when 'school_term' then
      return true;
    when 'faculty' then
      v_fac := coalesce(r.entity_id, (v_snap->>'id')::uuid, (v_snap->>'faculty_id')::uuid);
      return v_fac is not null and saais_private.has_role('dean', null, v_fac);
    when 'department' then
      v_dept := coalesce(r.entity_id, (v_snap->>'id')::uuid, (v_snap->>'department_id')::uuid);
      select d.faculty_id into v_fac from public.department d where d.id = v_dept;
      v_fac := coalesce(v_fac, (v_snap->>'faculty_id')::uuid);
      return (v_dept is not null and saais_private.has_role('department_head', v_dept))
        or (v_fac is not null and saais_private.has_role('dean', null, v_fac));
    when 'program' then
      select p.department_id into v_dept from public.program p where p.id = r.entity_id;
      v_dept := coalesce(v_dept, (v_snap->>'department_id')::uuid);
    when 'course' then
      select c.department_id into v_dept from public.course c where c.id = r.entity_id;
      v_dept := coalesce(v_dept, (v_snap->>'department_id')::uuid);
    when 'curriculum_version' then
      select v.program_id into v_prog from public.curriculum_version v where v.id = r.entity_id;
      v_prog := coalesce(v_prog, (v_snap->>'program_id')::uuid);
      select p.department_id into v_dept from public.program p where p.id = v_prog;
    when 'curriculum_term' then
      select t.curriculum_version_id into v_ver from public.curriculum_term t where t.id = r.entity_id;
      v_ver := coalesce(v_ver, (v_snap->>'curriculum_version_id')::uuid);
      select p.department_id into v_dept
        from public.curriculum_version v
        join public.program p on p.id = v.program_id
        where v.id = v_ver;
    when 'curriculum_term_course' then
      select s.curriculum_term_id into v_term from public.curriculum_term_course s where s.id = r.entity_id;
      v_term := coalesce(v_term, (v_snap->>'curriculum_term_id')::uuid);
      select p.department_id into v_dept
        from public.curriculum_term t
        join public.curriculum_version v on v.id = t.curriculum_version_id
        join public.program p on p.id = v.program_id
        where t.id = v_term;
    when 'prerequisite' then
      select pr.course_id into v_course from public.prerequisite pr where pr.id = r.entity_id;
      v_course := coalesce(v_course, (v_snap->>'course_id')::uuid);
      select c.department_id into v_dept from public.course c where c.id = v_course;
    when 'course_offering' then
      select o.course_id into v_course from public.course_offering o where o.id = r.entity_id;
      v_course := coalesce(v_course, (v_snap->>'course_id')::uuid);
      select c.department_id into v_dept from public.course c where c.id = v_course;
    when 'curriculum_pair_equivalence' then
      select e.from_curriculum_version_id, e.to_curriculum_version_id into v_ver, v_ver2
        from public.curriculum_pair_equivalence e where e.id = r.entity_id;
      v_ver := coalesce(v_ver, (v_snap->>'from_curriculum_version_id')::uuid);
      v_ver2 := coalesce(v_ver2, (v_snap->>'to_curriculum_version_id')::uuid);
      return exists (
        select 1 from public.curriculum_version v
        join public.program p on p.id = v.program_id
        where v.id in (v_ver, v_ver2)
          and saais_private.can_read_department(p.department_id, array['department_head', 'dean'])
      );
    when 'department_term_encoding' then
      select c.department_id into v_dept from public.department_term_encoding c where c.id = r.entity_id;
      v_dept := coalesce(v_dept, (v_snap->>'department_id')::uuid);
    when 'system_settings' then
      select s.department_id into v_dept from public.system_settings s where s.id = r.entity_id;
      v_dept := coalesce(v_dept, (v_snap->>'department_id')::uuid);
    when 'profile' then
      return r.entity_id is not null and (
        saais_private.can_read_student(r.entity_id, array['department_head', 'dean'])
        or exists (
          select 1 from public.profile p
          where p.id = r.entity_id and p.role <> 'admin'
            and (saais_private.can_read_department(p.department_id, array['department_head', 'dean'])
              or (p.faculty_id is not null and saais_private.has_role('dean', null, p.faculty_id)))
        ) or exists (
          select 1 from public.role_assignment ra
          where ra.profile_id = r.entity_id and ra.role <> 'admin'
            and (saais_private.can_read_department(ra.department_id, array['department_head', 'dean'])
              or (ra.faculty_id is not null and saais_private.has_role('dean', null, ra.faculty_id)))
        )
      );
    when 'adviser_dashboard' then
      v_dept := (v_snap->>'department_id')::uuid;
      v_fac := (v_snap->>'faculty_id')::uuid;
      return (v_dept is not null and saais_private.can_read_department(v_dept, array['department_head', 'dean']))
        or (v_dept is null and v_fac is not null and saais_private.has_role('dean', null, v_fac));
    else
      return false;
  end case;

  if v_dept is null then
    return false;
  end if;
  return saais_private.can_read_department(v_dept, array['department_head', 'dean'])
    or saais_private.has_role('department_head', v_dept);
exception when invalid_text_representation then
  return false;
end $$;

create or replace function saais_private.audit_display(p_entry uuid)
returns table(student_name text, student_number text, target_label text, old_value jsonb, new_value jsonb)
language sql stable security definer set search_path = pg_catalog as $$
  select left(s.full_name, 150), s.student_number,
    left(nullif(concat_ws(' · ', s.student_number, s.full_name), ''), 250),
    case when saais_private.can_read_department(null, array['admin']) then r.old_value end,
    case when saais_private.can_read_department(null, array['admin']) then r.new_value end
  from public.audit_log_entry r left join public.profile s on s.id = r.student_id
  where r.id = p_entry and saais_private.can_read_audit_entry(r.id);
$$;

create or replace function saais_private.audit_reason(p_entry uuid) returns text
language sql stable security definer set search_path = pg_catalog as $$
  select case
    when r.entity_type = 'adviser_assignment'
      and r.action in ('reassignAdviser', 'bulkReassignAdvisers')
      and not saais_private.can_read_student(r.student_id, array['department_head', 'dean', 'admin'])
    then null else r.reason end
  from public.audit_log_entry r
  where r.id = p_entry and saais_private.can_read_audit_entry(r.id);
$$;

revoke all on function saais_private.can_read_audit_entry(uuid),
  saais_private.audit_display(uuid), saais_private.audit_reason(uuid)
  from public, anon, authenticated;
grant execute on function saais_private.can_read_audit_entry(uuid),
  saais_private.audit_display(uuid), saais_private.audit_reason(uuid)
  to authenticated;

drop policy api_audit_read on public.audit_log_entry;
create policy api_audit_read on public.audit_log_entry for select to authenticated
  using (saais_private.can_read_audit_entry(id));

create or replace view saais_api.audit_log_entry with (security_barrier = true, security_invoker = true) as
select r.id, r.actor_id, r.actor_name, r.actor_role, r.student_id, display.student_name,
  display.student_number, display.target_label, r.action, r.action_category, r.entity_type, r.entity_id,
  left(coalesce(reason.value, r.action), 1000) as details_summary,
  display.old_value, display.new_value, reason.value as reason, r.created_at
from public.audit_log_entry r
cross join lateral saais_private.audit_display(r.id) display
cross join lateral (select saais_private.audit_reason(r.id) as value) reason
where saais_private.can_read_audit_entry(r.id);
