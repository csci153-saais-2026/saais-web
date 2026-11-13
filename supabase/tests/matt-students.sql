begin;

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  other_student uuid := '00000009-0000-4000-8000-000000000000';
  second_student uuid := '00000011-0000-4000-8000-000000000000';
  former uuid := '00000004-0000-4000-8000-000000000000';
  incoming uuid := '00000008-0000-4000-8000-000000000000';
  student_params jsonb := jsonb_build_object('student_id', student);
  other_params jsonb := jsonb_build_object('student_id', other_student);
  version uuid := (select (value->>'id')::uuid from test.records where name = 'version');
  offering uuid := (select (value->>'id')::uuid from test.records where name = 'source_offering');
  original_term uuid := (select (value->>'id')::uuid from test.records where name = 'school_term');
  elective uuid := (select (value->>'id')::uuid from test.records where name = 'elective_slot');
  original_attempt uuid := (select (value->>'id')::uuid from test.records where name = 'source_attempt');
  result jsonb;
  handoff jsonb;
  audit_total integer;
  notification_total integer;
begin
  insert into auth.users(id) values (second_student);
  insert into public.profile(id, role, email, full_name, student_number, status)
    values (second_student, 'student', 'student11@example.test', 'Person 11', 'TEST-11', 'active');
  insert into public.role_assignment(profile_id, role) values (second_student, 'student');
  insert into public.student_curriculum_assignment(student_id, curriculum_version_id, start_date, reason)
    values (second_student, version, '2026-01-01', 'Student test');
  insert into public.adviser_assignment(adviser_id, student_id, start_date, reason)
    values (former, second_student, '2026-01-01', 'Student test');

  perform test.login(5);
  result := public.matt_operation('getAcademicSummary', student_params);
  perform test.assert((result->>'gwa')::numeric = 2 and (result->>'counted_units')::numeric = 3,
    'The student can read their own cumulative GWA and contributing units.');
  result := public.matt_operation('getTermGrades', student_params);
  perform test.assert((result->0->>'school_term_id')::uuid = original_term
    and (result->0->>'gwa')::numeric = 2
    and (result->0->'attempts'->0->>'course_offering_id')::uuid = offering,
    'Grades preserve the recorded term, actual course offering and final-grade GWA.');
  begin
    perform public.matt_operation('getChecklist', other_params);
    raise exception 'A student read another student''s checklist.';
  exception when sqlstate 'PT403' then null;
  end;
  begin
    perform public.matt_operation('listStudentRoster');
    raise exception 'A student read the roster.';
  exception when sqlstate 'PT403' then null;
  end;

  perform test.login(4);
  perform test.call('createElectiveMapping', student_params, jsonb_build_object(
    'attempt_id', original_attempt, 'curriculum_term_course_id', elective, 'justification', 'Synthetic election'
  ));
  perform test.login(5);
  result := public.matt_operation('getChecklist', student_params || '{"limit":100}');
  perform test.assert(exists (
    select 1 from jsonb_array_elements(result) r
    where (r->>'curriculum_term_course_id')::uuid = elective
      and r->>'satisfaction_source' = 'Elective mapping'
      and r->>'status' = 'passed' and (r->>'earned_units')::numeric = 3
      and r->>'credited_course_code' = 'SRC101'
  ), 'The student checklist exposes actual credited units and safe course provenance.');

  perform test.login(2);
  result := public.matt_operation('listStudentRoster', '{"limit":1,"sort_dir":"desc","search":"person"}');
  perform test.assert((result->>'total_count')::integer = 2 and jsonb_array_length(result->'items') = 1
    and (result->'items'->0->>'student_id')::uuid = student,
    'Roster scopes before counting and applies stable search, sorting and pagination.');
  select count(*) into audit_total from public.audit_log_entry;
  select count(*) into notification_total from public.notification;
  begin
    perform public.matt_operation('bulkReassignAdvisers', '{}', jsonb_build_object(
      'student_ids', jsonb_build_array(student, other_student), 'adviser_id', incoming,
      'effective_since', '2026-02-01', 'reason', 'Atomic batch test'
    ));
    raise exception 'A department head changed an out-of-department student.';
  exception when sqlstate 'PT403' then null;
  end;
  perform test.assert((select count(*) from public.audit_log_entry) = audit_total
    and (select count(*) from public.notification) = notification_total
    and exists (select 1 from public.adviser_assignment a where a.student_id = student and a.adviser_id = former and a.end_date is null),
    'A rejected batch rolls back its earlier assignment, audit event and notifications.');

  handoff := public.matt_operation('reassignAdviser', student_params, jsonb_build_object(
    'adviser_id', incoming, 'start_date', '2026-02-01', 'reason', 'Single handoff test'
  ));
  perform test.assert(jsonb_array_length(handoff) = 2 and handoff->0->>'end_date' = handoff->1->>'start_date'
    and (handoff->0->>'handed_over_to_adviser_id')::uuid = incoming and not (handoff->0 ? 'reason'),
    'The single response includes adjacent public assignment records.');
  result := public.matt_operation('bulkReassignAdvisers', '{}', jsonb_build_object(
    'student_ids', jsonb_build_array(second_student), 'adviser_id', incoming,
    'effective_since', '2026-02-01', 'reason', 'Successful batch test'
  ));
  perform test.assert(result->>'reassigned_count' = '1' and (result->'assignments'->0->>'student_id')::uuid = second_student,
    'The successful bulk response contains the new assignments.');
  set constraints all immediate;

  perform test.login(4);
  result := public.matt_operation('listStudentRoster', '{"assignment_scope":"my_handed_over_advisees"}');
  perform test.assert((result->>'total_count')::integer = 2 and result->'items'->0->>'assignment_status' = 'past',
    'A former adviser can find handed-over students with their current assignment.');
  perform public.matt_operation('getAcademicSummary', student_params);
  perform test.expect('PT403', 'endorseCurriculumTransfer', student_params, jsonb_build_object(
    'to_curriculum_version_id', version, 'endorsement_note', 'Former adviser cannot write'
  ));
end;
$$;

rollback;
