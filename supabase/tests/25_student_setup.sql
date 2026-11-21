do $$declare version uuid; other uuid; faculty uuid; department uuid; term uuid; c jsonb; o jsonb; a public.attempt; s jsonb;
begin
  perform test.login(1);
  select (value->>'id')::uuid into version from test.records where name='version';
  select (value->>'id')::uuid into other from test.records where name='version_b';
  select (value->>'id')::uuid into term from test.records where name='school_term';
  select (value->>'id')::uuid into department from test.records where name='department';
  insert into public.student_curriculum_assignment(student_id,curriculum_version_id,start_date,reason) values
    ('00000005-0000-4000-8000-000000000000',version,'2026-01-01','Test initial'),('00000009-0000-4000-8000-000000000000',other,'2026-01-01','Test initial');
  insert into public.adviser_assignment(adviser_id,student_id,start_date,reason) values
    ('00000004-0000-4000-8000-000000000000','00000005-0000-4000-8000-000000000000','2026-01-01','Test initial'),
    ('00000008-0000-4000-8000-000000000000','00000009-0000-4000-8000-000000000000','2026-01-01','Test initial');
  c:=test.call('createCourse','{}',jsonb_build_object('department_id',department,'code','SRC101','title','Source Course','units',3));
  o:=test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',c->>'id'));
  insert into public.attempt(student_id,course_offering_id,status,final_grade,units_attempted,created_by,updated_by)
    values('00000005-0000-4000-8000-000000000000',(o->>'id')::uuid,'passed',2,3,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000') returning * into a;
  s:=test.call('createCurriculumTermCourse','{}',jsonb_build_object('curriculum_term_id',(select value->>'id' from test.records where name='term'),'is_elective_slot',true,'slot_label','Elective A','nominal_units',3));
  insert into test.records values('source_course',c),('source_offering',o),('source_attempt',to_jsonb(a)),('elective_slot',s);
end$$;
