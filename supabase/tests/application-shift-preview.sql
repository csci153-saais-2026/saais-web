do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  version uuid;
  target uuid;
  program uuid;
  source_course uuid;
  target_course uuid;
  term uuid;
  source_attempt uuid;
  elective_slot uuid;
  mapping jsonb;
  preview jsonb;
  assigned jsonb;
begin
  perform test.login(1);
  select (value->>'id')::uuid into version from test.records where name = 'version';
  select (value->>'id')::uuid into target from test.records where name = 'target_version';
  select (value->>'id')::uuid into program from test.records where name = 'program';
  select (value->>'id')::uuid into source_course from test.records where name = 'source_course';
  select (value->>'id')::uuid into target_course from test.records where name = 'course';
  select (value->>'id')::uuid into term from test.records where name = 'term';
  select (value->>'id')::uuid into source_attempt from test.records where name = 'source_attempt';
  select (value->>'id')::uuid into elective_slot from test.records where name = 'elective_slot';

  perform test.call('updateCurriculumVersion', jsonb_build_object('id', target), '{"status":"active"}');
  perform test.call('createCurriculumTermCourse', '{}',
    jsonb_build_object('curriculum_term_id', term, 'course_id', source_course, 'is_elective_slot', false, 'nominal_units', 3));
  perform test.call('createCurriculumPairEquivalence', '{}',
    jsonb_build_object('from_curriculum_version_id', version, 'to_curriculum_version_id', target,
      'source_course_id', source_course, 'target_course_id', target_course));

  perform test.login(4);
  mapping := test.call('createElectiveMapping', jsonb_build_object('student_id', student),
    jsonb_build_object('attempt_id', source_attempt, 'curriculum_term_course_id', elective_slot,
      'justification', 'Count passed course toward current elective slot'));

  begin
    perform test.call('previewCurriculumShift', jsonb_build_object('student_id', student),
      jsonb_build_object('curriculum_version_id', target));
    raise exception 'A preview was returned for a shift blocked by an active elective mapping';
  exception when sqlstate 'PT409' then
    perform test.assert(sqlerrm = 'Revoke the active elective mapping before shifting this curriculum.',
      'Shift preview tells the caller how to resolve the conflict');
  end;

  perform test.login(2);
  perform test.expect('PT409', 'assignStudentCurriculum', jsonb_build_object('student_id', student),
    jsonb_build_object('curriculum_version_id', target, 'program_id', program,
      'start_date', '2026-02-01', 'reason', 'Blocked by active elective mapping'));
  perform test.assert(exists(select 1 from public.elective_mapping where id = (mapping->>'id')::uuid and revoked_at is null),
    'Conflicting curriculum shift must preserve the existing elective mapping');
  perform test.assert(not exists(select 1 from public.equivalency_decision where student_id = student and revoked_at is null),
    'Blocked curriculum shift must not create transfer equivalency credit');

  perform test.login(4);
  perform test.call('revokeElectiveMapping',
    jsonb_build_object('student_id', student, 'decision_id', mapping->>'id'),
    jsonb_build_object('reason', 'Revoke before shifting curriculum', 'expected_updated_at', mapping->>'updated_at'));

  preview := test.call('previewCurriculumShift', jsonb_build_object('student_id', student),
    jsonb_build_object('curriculum_version_id', target));
  perform test.assert(preview = '{"carried_units":3,"lost_units":0,"projected_gwa":2,"mutates_records":false}'::jsonb,
    'Shift preview shows the expected carryover after the mapping is revoked');

  perform test.login(2);
  assigned := test.call('assignStudentCurriculum', jsonb_build_object('student_id', student),
    jsonb_build_object('curriculum_version_id', target, 'program_id', program,
      'start_date', '2026-02-01', 'reason', 'Shift after revoking elective mapping'));
  perform test.assert((assigned->>'curriculum_version_id')::uuid = target,
    'Curriculum assignment succeeds once the conflicting elective mapping is revoked');
  perform test.assert((select count(*) = 1 from public.equivalency_decision where student_id = student and revoked_at is null),
    'Revoked elective mapping allows the transfer equivalency decision without duplicate credit');
end $$;
