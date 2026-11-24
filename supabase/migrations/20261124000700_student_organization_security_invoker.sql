grant select (id, program_id, version_label, effective_start, effective_end, delinquency_threshold, total_units, status)
  on public.curriculum_version to authenticated;
create policy api_curriculum_version_read on public.curriculum_version for select to authenticated
  using (saais_private.can_read_curriculum(id));
alter view saais_api.curriculum_version set (security_invoker = true);

grant select (id, adviser_id, student_id, start_date, end_date, created_at)
  on public.adviser_assignment to authenticated;
create policy api_adviser_assignment_read on public.adviser_assignment for select to authenticated
  using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));

-- Entry year is visible in the organization projection, not as a general
-- profile column. Restrict direct function calls to the same current students.
create function saais_private.organization_entry_year(p_student uuid) returns integer
language sql stable security definer set search_path = pg_catalog as $$
  select s.entry_year from public.profile s
  where s.id = p_student
    and saais_private.can_read_student(s.id, array['student','adviser','department_head','department_staff','dean','admin'])
    and exists (select 1 from public.student_curriculum_assignment c
      where c.student_id = s.id and c.end_date is null);
$$;
revoke all on function saais_private.organization_entry_year(uuid) from public, anon, authenticated;
grant execute on function saais_private.organization_entry_year(uuid) to authenticated;

create or replace view saais_api.student_organization with (security_barrier = true, security_invoker = true) as
select r.student_id, r.id as student_curriculum_assignment_id, r.curriculum_version_id, p.id as program_id,
  d.id as department_id, d.faculty_id as faculty_id, a.adviser_id as adviser_id,
  saais_private.organization_entry_year(r.student_id) as entry_year
from public.student_curriculum_assignment r
join public.curriculum_version v on v.id = r.curriculum_version_id
join public.program p on p.id = v.program_id
join public.department d on d.id = p.department_id
left join public.adviser_assignment a on a.student_id = r.student_id and a.end_date is null
where r.end_date is null
  and saais_private.can_read_student(r.student_id, array['student','adviser','department_head','department_staff','dean','admin']);
