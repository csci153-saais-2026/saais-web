do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  department uuid := (select (value->>'id')::uuid from test.records where name='department');
  term public.school_term;
  later_term public.school_term;
  same_term_attempt uuid;
  target uuid;
  prerequisite uuid;
  target_offering uuid;
  prerequisite_offering uuid;
  attempt_row public.attempt;
  value public.attempt;
  result jsonb;
  blocked boolean;
  flag_id uuid;
  org jsonb;
  attempt_params jsonb;
  grade_input jsonb;
  conflict_detail text;
begin
  insert into public.school_term(start_year,end_year,term_type,ends_on)
    values(2094,2095,'1st Semester','2094-12-01') returning * into term;
  insert into public.school_term(start_year,end_year,term_type,ends_on)
    values(2094,2095,'2nd Semester','2095-05-01') returning * into later_term;
  insert into public.course(department_id,code,title,units) values(department,'REV102','Target course',3) returning id into target;
  insert into public.course(department_id,code,title,units) values(department,'REV101','Prerequisite course',3) returning id into prerequisite;
  insert into public.prerequisite(course_id,prerequisite_course_id,type) values(target,prerequisite,'strict');
  insert into public.course_offering(school_term_id,course_id) values(term.id,target) returning id into target_offering;
  insert into public.course_offering(school_term_id,course_id) values(term.id,prerequisite) returning id into prerequisite_offering;
  insert into public.attempt(student_id,course_offering_id,status,final_grade,units_attempted,created_by,updated_by)
    values(student,prerequisite_offering,'passed',2,3,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000') returning id into same_term_attempt;
  perform test.assert(not exists(
    select 1 from saais_private.matt_unmet_prerequisites(student,target,later_term.chronological_key)
  ), 'The same pass satisfies the strict prerequisite for a later term');

  perform test.login(4);
  result := public.matt_operation('searchStudentCourseOfferings',jsonb_build_object('student_id',student,'school_term_id',term.id,'search','REV102'));
  perform test.assert(jsonb_array_length(result)=1
    and result->0->>'has_unmet_strict_prerequisites'='true'
    and result->0->'unmet_prerequisites'->0->>'current_status'='currently_enrolled'
    and (result->0->'unmet_prerequisites'->0->>'latest_attempt_id')::uuid=same_term_attempt,
    'The course picker reports a same-term pass as an unmet prerequisite with a valid status');

  grade_input := jsonb_build_object('school_term_id',term.id,'course_offering_id',target_offering,
    'confirmed_enrollment',true,'midterm_grade',2);
  begin
    perform public.matt_operation('recordGrades',jsonb_build_object('student_id',student),grade_input);
    raise exception 'Grade recording accepted a same-term pass without an override';
  exception when sqlstate 'PT409' then
    get stacked diagnostics conflict_detail = pg_exception_detail;
    perform test.assert(conflict_detail='PREREQUISITE_NOT_MET',
      'The grade recording conflict identifies the unmet strict prerequisite');
  end;
  perform test.assert(not exists(select 1 from public.attempt
    where student_id=student and course_offering_id=target_offering),
    'A rejected grade recording leaves the target offering unchanged');

  result := public.matt_operation('recordGrades',jsonb_build_object('student_id',student),
    grade_input || '{"continue_with_prerequisite_override":true,"prerequisite_override_reason":"Approved concurrent enrollment"}');
  perform test.assert(result->>'prerequisite_override'='true' and exists(
    select 1 from public.audit_log_entry where entity_id=(result->>'id')::uuid
      and action='attempt.prerequisite_override' and reason='Approved concurrent enrollment'
  ), 'An explicit override allows grade recording and audits its reason');

  update public.attempt set status='inc',final_grade=null,inc_deadline=current_date-1 where id=same_term_attempt returning * into attempt_row;
  for result in select x from jsonb_array_elements('[{"final_grade":5},{"final_grade":1},{"status":"dr"},{"midterm_status":"dr"}]'::jsonb) x loop
    blocked := false;
    begin
      value := saais_private.matt_grade_values(attempt_row,result,term);
    exception when sqlstate 'PT409' then blocked := true; end;
    perform test.assert(blocked,'Numeric or nonnumeric rewrites of recorded INC are rejected');
  end loop;
  org := saais_private.matt_grade_student(student);
  attempt_params := jsonb_build_object('student_id',student,'attempt_id',same_term_attempt);
  blocked := false;
  begin
    perform public.matt_operation('correctGrades',attempt_params,
      jsonb_build_object('expected_revision',attempt_row.revision,'reason','Regression test','final_grade',5));
  exception when sqlstate 'PT409' then blocked := true; end;
  perform test.assert(blocked,'Correction endpoint rejects INC final grade rewrite');
  for result in select x from jsonb_array_elements('["encodeTermGrades","importGradesBatch"]'::jsonb) x loop
    blocked := false;
    begin
      perform saais_private.matt_record_grade_row(student,org,term,
        jsonb_build_object('course_offering_id',prerequisite_offering,'final_grade',1),result#>>'{}');
    exception when sqlstate 'PT409' then blocked := true; end;
    perform test.assert(blocked,'Encode and import grade paths reject INC rewrites');
  end loop;
  insert into public.grade_flag(student_id,attempt_id,reported_stage,issue_type,details)
    values(student,same_term_attempt,'final','wrong_grade','Review flag') returning id into flag_id;
  blocked := false;
  begin
    perform saais_private.matt_resolvegradeflag(jsonb_build_object('flag_id',flag_id),
      jsonb_build_object('resolution_action','correct','resolution_note','Review flag',
        'expected_revision',attempt_row.revision,'corrected_grade',1));
  exception when sqlstate 'PT409' then blocked := true; end;
  perform test.assert(blocked and (select status='open' from public.grade_flag where id=flag_id),
    'Flag resolution cannot rewrite INC or close the rejected flag');
  value := saais_private.matt_grade_values(attempt_row,'{"instructor":"Updated"}',term);
  perform test.assert(value.status='inc' and value.inc_deadline=attempt_row.inc_deadline,
    'Non-grade metadata changes retain INC and deadline');
  perform test.assert((select status='inc' and final_grade is null from public.attempt where id=same_term_attempt),
    'Rejected corrections leave the original attempt unchanged');
end $$;
