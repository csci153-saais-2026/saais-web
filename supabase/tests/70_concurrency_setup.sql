do $$declare slot jsonb; term uuid;
begin
  perform test.login(1);
  select t.id into term from public.curriculum_term t where t.curriculum_version_id=(select (value->>'id')::uuid from test.records where name='target_version') limit 1;
  slot:=test.call('createCurriculumTermCourse','{}',jsonb_build_object('curriculum_term_id',term,'is_elective_slot',true,'slot_label','Concurrency Test','nominal_units',3));
  insert into test.records values('race_slot',slot);
end$$;
