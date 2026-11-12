do $$declare student uuid:='00000005-0000-4000-8000-000000000000'; slot uuid; offering uuid; source uuid; credit jsonb;
begin
  select (value->>'id')::uuid into slot from test.records where name='slot';
  select (value->>'id')::uuid into offering from test.records where name='offering';
  insert into public.attempt(student_id,course_offering_id,curriculum_term_course_id,status,inc_deadline,units_attempted,created_by,updated_by)
    values(student,offering,slot,'inc','2027-12-01',3,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000') returning id into source;
  perform test.login(2);
  credit:=test.call('createOutsideCredit',jsonb_build_object('student_id',student),jsonb_build_object('entry_type','transferee','origin_school','INC Collision Test','original_course_code','INC-SRC','original_course_title','Prior Passing Source','units',3,'grade','2.00','destination_curriculum_term_course_id',slot,'reason','Collision test'));
  begin
    insert into public.inc_resolution(student_id,attempt_id,completion_grade,resolved_by,updated_by,reason)
      values(student,source,2,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000','Conflicting direct completion');
    raise exception 'INC completion duplicated outside credit';
  exception when sqlstate 'PT409' then null; end;
  perform test.assert(not exists(select 1 from public.inc_resolution where attempt_id=source),'failed INC completion survived');
  perform test.call('revokeOutsideCredit',jsonb_build_object('student_id',student,'credit_id',credit->>'id'),jsonb_build_object('reason','Release slot','expected_updated_at',credit->>'updated_at'));
  insert into public.inc_resolution(student_id,attempt_id,completion_grade,resolved_by,updated_by,reason)
    values(student,source,2,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000','Allowed direct completion');
  perform test.assert(saais_private.passed(source),'INC completion did not become effective');
  -- Remove only test-owned fixture rows so the subsequent shift fixture is unchanged.
  delete from public.inc_resolution where attempt_id=source;
  delete from public.attempt where id=source;
end$$;
