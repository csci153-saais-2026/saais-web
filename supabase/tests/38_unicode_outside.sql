do $$declare student uuid:='00000005-0000-4000-8000-000000000000'; slot uuid; fixed uuid; credit jsonb; body jsonb;
begin
  perform test.assert(saais_private.outside_key(' Straße ')=saais_private.outside_key('STRASSE'),'Unicode sharp-s case fold');
  perform test.assert(saais_private.outside_key('Σ')=saais_private.outside_key('ς'),'Unicode sigma case fold');
  perform test.assert(saais_private.outside_key(U&'  Test\00a0\2003School ')=saais_private.outside_key('test school'),'Unicode whitespace collapse');
  select (value->>'id')::uuid into slot from test.records where name='elective_slot';
  select (value->>'id')::uuid into fixed from test.records where name='slot';
  perform test.login(2);
  body:=jsonb_build_object('entry_type','transferee','origin_school','Straße Test','original_course_code','ΟΣ101','original_course_title','Unicode Test','units',3,'grade','2.00','destination_curriculum_term_course_id',slot,'reason','Normalization test');
  credit:=test.call('createOutsideCredit',jsonb_build_object('student_id',student),body);
  perform test.expect('PT409','createOutsideCredit',jsonb_build_object('student_id',student),body||jsonb_build_object('origin_school','STRASSE TEST','original_course_code','οσ101','destination_curriculum_term_course_id',fixed));
  perform test.call('revokeOutsideCredit',jsonb_build_object('student_id',student,'credit_id',credit->>'id'),jsonb_build_object('reason','Finish normalization test','expected_updated_at',credit->>'updated_at'));
end$$;
