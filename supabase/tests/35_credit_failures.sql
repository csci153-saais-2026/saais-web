do $$declare student uuid:='00000005-0000-4000-8000-000000000000'; source uuid; slot uuid; elective uuid; body jsonb; before_count bigint;
begin
  select (value->>'id')::uuid into source from test.records where name='source_attempt';
  select (value->>'id')::uuid into slot from test.records where name='slot';
  select (value->>'id')::uuid into elective from test.records where name='elective_slot';
  body:=jsonb_build_object('attempt_id',source,'destination_curriculum_term_course_id',slot,'decision_type','transfer_equivalency','justification','Failed source test');
  perform test.login(4);
  update public.attempt set status='failed',final_grade=4 where id=source;
  select count(*) into before_count from public.equivalency_decision;
  perform test.expect('PT409','createEquivalencyDecision',jsonb_build_object('student_id',student),body);
  perform test.assert((select count(*)=before_count from public.equivalency_decision),'invalid equivalency survived');
  update public.attempt set status='passed',final_grade=2 where id=source;
  perform test.expect('PT409','createEquivalencyDecision',jsonb_build_object('student_id',student),body||'{"decision_type":"discontinued_course_equivalency"}');
  perform test.login(8);
  perform test.expect('PT404','createElectiveMapping',jsonb_build_object('student_id','00000009-0000-4000-8000-000000000000'),jsonb_build_object('attempt_id',source,'curriculum_term_course_id',elective,'justification','Source belongs to another student'));
end$$;
