do $$
declare
  department uuid := (select (value->>'id')::uuid from test.records where name='department');
  term uuid := (select (value->>'id')::uuid from test.records where name='school_term');
  course jsonb;
  offering jsonb;
  input jsonb;
  result jsonb;
begin
  perform test.login(1);
  course := test.call('createCourse','{}',jsonb_build_object('department_id',department,'code','IMPORT201','title','Import test','units',3));
  offering := test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',course->>'id'));
  perform test.login(4);
  input := jsonb_build_object('mode','preview','school_term_id',term,'rows',jsonb_build_array(
    '{"row_number":1,"student_number":"TEST-5","course_code":"IMPORT201","final_grade":2}'::jsonb,
    '{"row_number":2,"student_number":"TEST-5","course_code":"IMPORT201","final_grade":3}'::jsonb,
    '{"row_number":3,"student_number":"TEST-9","course_code":"IMPORT201","final_grade":2}'::jsonb));
  result := public.matt_operation('importGradesBatch','{}',input);
  perform test.assert(result->>'valid_count'='1' and result->>'error_count'='2' and result->>'imported_count'='0','preview validates and rejects duplicates and out-of-scope students');
  perform test.assert(not exists(select 1 from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),'preview rolls back grade writes');
  result := public.matt_operation('importGradesBatch','{}',input||'{"mode":"commit"}');
  perform test.assert(result->>'imported_count'='1' and result->>'error_count'='2','commit saves only valid rows');
  perform test.assert((select count(*) from public.attempt a where a.course_offering_id=(offering->>'id')::uuid and a.final_grade=2)=1,'grade is persisted');
end $$;
