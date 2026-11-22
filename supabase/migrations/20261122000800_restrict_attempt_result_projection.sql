-- Keep the Data API and its directly callable helper on the frozen safe projection.
create or replace function saais_private.read_attempt_results(p_student uuid) returns setof jsonb
language sql stable security definer set search_path = pg_catalog as $$
  select jsonb_build_object(
    'id', a.id, 'student_id', a.student_id, 'course_offering_id', a.course_offering_id,
    'curriculum_term_course_id', a.curriculum_term_course_id, 'recorded_status', a.status,
    'midterm_status', a.midterm_status, 'midterm_grade', a.midterm_grade, 'final_grade', a.final_grade,
    'inc_deadline', a.inc_deadline, 'instructor', a.instructor, 'prerequisite_override', a.prerequisite_override,
    'prerequisite_grade_override', a.prerequisite_grade_override, 'units_attempted', a.units_attempted,
    'revision', a.revision, 'created_at', a.created_at, 'updated_at', a.updated_at,
    'completion_grade', e.completion_grade, 'resolved_at', e.resolved_at,
    'effective_status', e.effective_status, 'gwa_grade', e.gwa_grade,
    'is_lapsed_inc', e.is_lapsed_inc, 'is_repeated', e.is_repeated,
    'counts_toward_cumulative_gwa', e.counts_toward_cumulative_gwa
  )
  from saais_private.matt_effective_attempts(p_student) e
  join public.attempt a on a.id = e.attempt_id
  where saais_private.can_read_student(p_student, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);
$$;

revoke execute on function saais_private.matt_attempt_result(uuid), saais_private.matt_grade_fix_history(uuid)
  from public, anon, authenticated;

-- Removing a column requires recreating the view. Keep its existing scope and grant.
drop view saais_api.attempt_result;
create view saais_api.attempt_result with (security_barrier = true) as
select r.*
from saais_api.student_organization s
cross join lateral saais_private.read_attempt_results(s.student_id) result
cross join lateral jsonb_to_record(result) as r (
  id uuid, student_id uuid, course_offering_id uuid, curriculum_term_course_id uuid,
  recorded_status text, midterm_status text, midterm_grade numeric, final_grade numeric,
  inc_deadline date, instructor text, prerequisite_override boolean, prerequisite_grade_override boolean,
  units_attempted numeric, revision bigint, created_at timestamptz, updated_at timestamptz,
  completion_grade numeric, resolved_at timestamptz, effective_status text,
  gwa_grade numeric, is_lapsed_inc boolean, is_repeated boolean, counts_toward_cumulative_gwa boolean
);
revoke all on saais_api.attempt_result from public, anon, authenticated;
grant select on saais_api.attempt_result to authenticated;
