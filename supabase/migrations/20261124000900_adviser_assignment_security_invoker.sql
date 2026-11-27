-- Return only the adviser display fields already published for an authorized
-- assignment, without granting access to unrelated staff profiles.
create function saais_private.assignment_display(p_assignment uuid)
returns table(adviser_name text, adviser_email text, adviser_faculty_name text,
  adviser_consultation_hours text, handed_over_to_adviser_id uuid,
  handed_over_to_name text, handover_label text)
language sql stable security definer set search_path = pg_catalog as $$
  select left(adviser.full_name, 150), adviser.email, left(faculty.name, 250),
    adviser.consultation_hours, next_adviser.id, left(next_adviser.full_name, 150),
    case when next_adviser.id is not null
      then left('Handed over to ' || next_adviser.full_name || ' (' || to_char(r.end_date, 'Mon YYYY') || ')', 200) end
  from public.adviser_assignment r
  join public.profile adviser on adviser.id = r.adviser_id
  left join public.department d on d.id = adviser.department_id
  left join public.faculty faculty on faculty.id = coalesce(adviser.faculty_id, d.faculty_id)
  left join public.adviser_assignment successor on successor.student_id = r.student_id and successor.start_date = r.end_date
  left join public.profile next_adviser on next_adviser.id = successor.adviser_id
  where r.id = p_assignment and saais_private.can_read_student(r.student_id,
    array['student','adviser','department_head','department_staff','dean','admin']);
$$;
revoke all on function saais_private.assignment_display(uuid) from public, anon, authenticated;
grant execute on function saais_private.assignment_display(uuid) to authenticated;

create or replace view saais_api.adviser_assignment with (security_barrier = true, security_invoker = true) as
select r.id, r.adviser_id, display.adviser_name, display.adviser_email,
  display.adviser_faculty_name, display.adviser_consultation_hours, r.student_id, r.start_date, r.end_date,
  display.handed_over_to_adviser_id, display.handed_over_to_name, display.handover_label, r.created_at
from public.adviser_assignment r
cross join lateral saais_private.assignment_display(r.id) display
where saais_private.can_read_student(r.student_id,
  array['student','adviser','department_head','department_staff','dean','admin']);
