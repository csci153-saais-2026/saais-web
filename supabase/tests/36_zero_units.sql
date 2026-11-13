do $$declare student uuid:='00000005-0000-4000-8000-000000000000'; department uuid; term uuid; school uuid; c jsonb; o jsonb; slot jsonb; source uuid; result jsonb;
begin
  perform test.login(1);
  select (value->>'id')::uuid into department from test.records where name='department';
  select (value->>'id')::uuid into term from test.records where name='term';
  select (value->>'id')::uuid into school from test.records where name='school_term';
  c:=test.call('createCourse','{}',jsonb_build_object('department_id',department,'code','ZERO101','title','Non Credit Requirement','units',0,'category','nstp'));
  o:=test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',school,'course_id',c->>'id'));
  slot:=test.call('createCurriculumTermCourse','{}',jsonb_build_object('curriculum_term_id',term,'is_elective_slot',true,'slot_label','Zero Unit Slot','nominal_units',0));
  insert into public.attempt(student_id,course_offering_id,status,final_grade,units_attempted,created_by,updated_by)
    values(student,(o->>'id')::uuid,'passed',2,0,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000') returning id into source;
  perform test.login(4);
  result:=test.call('createElectiveMapping',jsonb_build_object('student_id',student),jsonb_build_object('attempt_id',source,'curriculum_term_course_id',slot->>'id','justification','Zero units remain zero'));
  perform test.assert((result->>'units_credited')::numeric=0,'zero snapshot was inflated');
  perform test.call('revokeElectiveMapping',jsonb_build_object('student_id',student,'decision_id',result->>'id'),jsonb_build_object('reason','End zero test','expected_updated_at',result->>'updated_at'));
end$$;
