create function test.expect_recording_rejected(p_status text, p_operation text, p_params jsonb, p_body jsonb)
returns void language plpgsql as $$
begin
  perform public.matt_operation(p_operation, p_params, p_body);
  raise exception 'Unexpected success for %', p_operation;
exception when others then
  if sqlstate <> p_status then raise; end if;
end;
$$;

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  params jsonb := jsonb_build_object('student_id', student);
  department uuid := (select (value->>'id')::uuid from test.records where name = 'department');
  term uuid;
  required_course uuid;
  new_course uuid;
  new_offering uuid;
  other_offering uuid;
  passed_offering uuid;
  audit_before integer;
  attempt_before integer;
  payload jsonb;
  result jsonb;
begin
  insert into public.school_term(start_year, end_year, term_type, ends_on)
    values (2096, 2097, '1st Semester', '2096-12-01') returning id into term;
  insert into public.course(department_id, code, title, units)
    values (department, 'ENR101', 'Enrollment test', 3) returning id into new_course;
  insert into public.course(department_id, code, title, units)
    values (department, 'ENR090', 'Strict prerequisite', 3) returning id into required_course;
  insert into public.prerequisite(course_id, prerequisite_course_id, type)
    values (new_course, required_course, 'strict');
  insert into public.course_offering(school_term_id, course_id)
    values (term, new_course) returning id into new_offering;
  insert into public.course_offering(school_term_id, course_id)
    values (term, required_course) returning id into other_offering;
  insert into public.course_offering(school_term_id, course_id)
    values (term, (select (value->>'id')::uuid from test.records where name = 'source_course')) returning id into passed_offering;

  payload := jsonb_build_object('school_term_id', term, 'course_offering_id', new_offering);
  select count(*) into audit_before from public.audit_log_entry;
  select count(*) into attempt_before from public.attempt;
  perform test.login(5);
  perform test.expect_recording_rejected('PT403', 'recordGrades', params, payload);
  perform test.login(8);
  perform test.expect_recording_rejected('PT403', 'recordGrades', params, payload);
  perform test.login(4);
  perform test.expect_recording_rejected('PT400', 'recordGrades', params, payload || '{"final_grade":2.17}');
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload || '{"midterm_grade":2.00}');
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload);
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload || '{"continue_with_prerequisite_override":true}');
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload || jsonb_build_object('course_offering_id', passed_offering));
  perform test.expect_recording_rejected('PT409', 'encodeTermGrades', params, jsonb_build_object(
    'school_term_id', term, 'rows', jsonb_build_array(
      jsonb_build_object('course_offering_id', other_offering),
      jsonb_build_object('course_offering_id', new_offering)
    )));
  perform test.assert((select count(*) = audit_before from public.audit_log_entry) and
    (select count(*) = attempt_before from public.attempt), 'Rejected enrollment and partial batch writes leave no attempts or audits');
  insert into public.department_term_encoding(school_term_id, department_id, is_closed)
    values (term, department, true);
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload);
  update public.department_term_encoding set is_closed = false where school_term_id = term;
  update public.school_term set is_locked = true where id = term;
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload);
  update public.school_term set is_locked = false where id = term;

  result := public.matt_operation('recordGrades', params, payload ||
    '{"midterm_grade":2.00,"confirmed_enrollment":true,"continue_with_prerequisite_override":true,"prerequisite_override_reason":"Authorized exception"}');
  perform test.assert(result->>'midterm_grade' = '2.00' and (result->>'prerequisite_override')::boolean,
    'A confirmed enrollment records the grade and explicit prerequisite decision');
  perform test.assert((select count(*)=1 from public.audit_log_entry
    where student_id = student and entity_id = (result->>'id')::uuid and action = 'recordGrades'
      and actor_id = auth.uid()), 'Enrollment records the actor and student in the audit log');
  perform test.assert((select count(*)=1 from public.audit_log_entry
    where entity_id = (result->>'id')::uuid and action = 'attempt.prerequisite_override'
      and reason = 'Authorized exception'), 'The prerequisite override is audited with its reason');
  perform test.expect_recording_rejected('PT409', 'recordGrades', params, payload);
end;
$$;
