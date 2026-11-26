do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  department uuid := (select (value->>'id')::uuid from test.records where name='department');
  term public.school_term;
  prior uuid;
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
begin
  insert into public.school_term(start_year,end_year,term_type,ends_on)
    values(2094,2095,'1st Semester','2094-12-01') returning * into term;
  insert into public.course(department_id,code,title,units) values(department,'REV102','Target course',3) returning id into target;
  insert into public.course(department_id,code,title,units) values(department,'REV101','Prerequisite course',3) returning id into prerequisite;
  insert into public.prerequisite(course_id,prerequisite_course_id,type) values(target,prerequisite,'strict');
  insert into public.course_offering(school_term_id,course_id) values(term.id,target) returning id into target_offering;
  insert into public.course_offering(school_term_id,course_id) values(term.id,prerequisite) returning id into prerequisite_offering;
  insert into public.attempt(student_id,course_offering_id,status,final_grade,units_attempted)
    values(student,prerequisite_offering,'passed',2,3) returning id into prior;
  perform test.assert(not exists(select 1 from saais_private.matt_unmet_prerequisites(student,target,term.chronological_key)),
    'Same-term passed prerequisite is satisfied and never yields an invalid passed status');
  perform test.login(4);
  result := public.matt_operation('searchStudentCourseOfferings',jsonb_build_object('student_id',student,'school_term_id',term.id,'search','REV102'));
  perform test.assert(jsonb_array_length(result)=1 and result->0->>'has_unmet_strict_prerequisites'='false',
    'Course-offering search succeeds for a same-term passed prerequisite');
  update public.attempt set status='inc',final_grade=null,inc_deadline=current_date-1 where id=prior returning * into attempt_row;
  for result in select x from jsonb_array_elements('[{"final_grade":5},{"final_grade":1},{"status":"dr"},{"midterm_status":"dr"}]'::jsonb) x loop
    blocked := false;
    begin
      value := saais_private.matt_grade_values(attempt_row,result,term);
    exception when sqlstate 'PT409' then blocked := true; end;
    perform test.assert(blocked,'Numeric or nonnumeric rewrites of recorded INC are rejected');
  end loop;
  org := saais_private.matt_grade_student(student);
  attempt_params := jsonb_build_object('student_id',student,'attempt_id',prior);
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
    values(student,prior,'final','wrong_grade','Review flag') returning id into flag_id;
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
  perform test.assert((select status='inc' and final_grade is null from public.attempt where id=prior),
    'Rejected corrections leave the original attempt unchanged');
end $$;
