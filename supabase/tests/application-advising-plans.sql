do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  other_student uuid := '00000009-0000-4000-8000-000000000000';
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  term uuid := (select (value->>'id')::uuid from test.records where name = 'school_term');
  assignment uuid := (saais_private.organization(student)->>'student_curriculum_assignment_id')::uuid;
  curriculum uuid := (saais_private.organization(student)->>'curriculum_version_id')::uuid;
  department uuid := (saais_private.organization(student)->>'department_id')::uuid;
  curriculum_term uuid;
  first_course jsonb;
  next_course jsonb;
  blocked_course jsonb;
  missing_course jsonb;
  offering jsonb;
  next_offering jsonb;
  blocked_offering jsonb;
  plan_body jsonb;
  params jsonb := jsonb_build_object('student_id', student, 'school_term_id', term);
  recommendation jsonb;
  saved jsonb;
  attempt_count integer;
  plan_id uuid;
begin
  perform test.login(1);
  select t.id into curriculum_term from public.curriculum_term t where t.curriculum_version_id = curriculum
    order by t.year_level, t.term_sequence limit 1;
  first_course := test.call('createCourse', '{}', jsonb_build_object(
    'department_id', department, 'code', 'PLAN101', 'title', 'Test planned course', 'units', 3));
  next_course := test.call('createCourse', '{}', jsonb_build_object(
    'department_id', department, 'code', 'PLAN102', 'title', 'Test second course', 'units', 3));
  blocked_course := test.call('createCourse', '{}', jsonb_build_object(
    'department_id', department, 'code', 'PLAN103', 'title', 'Test blocked course', 'units', 3));
  missing_course := test.call('createCourse', '{}', jsonb_build_object(
    'department_id', department, 'code', 'PLAN104', 'title', 'Test unavailable course', 'units', 3));
  for recommendation in select value from jsonb_array_elements(jsonb_build_array(first_course, next_course, blocked_course, missing_course))
  loop
    perform test.call('createCurriculumTermCourse', '{}', jsonb_build_object(
      'curriculum_term_id', curriculum_term, 'course_id', recommendation->>'id', 'is_elective_slot', false, 'nominal_units', 3));
  end loop;
  perform test.call('createPrerequisite', '{}', jsonb_build_object(
    'course_id', blocked_course->>'id', 'prerequisite_course_id', missing_course->>'id', 'type', 'strict'));
  offering := test.call('createCourseOffering', '{}', jsonb_build_object(
    'school_term_id', term, 'course_id', first_course->>'id', 'is_by_request', true));
  next_offering := test.call('createCourseOffering', '{}', jsonb_build_object(
    'school_term_id', term, 'course_id', next_course->>'id'));
  blocked_offering := test.call('createCourseOffering', '{}', jsonb_build_object(
    'school_term_id', term, 'course_id', blocked_course->>'id'));

  perform test.login(4);
  recommendation := public.matt_operation('listRecommendations', params);
  perform test.assert((recommendation->>'excluded_count')::integer > 0, 'Recommendation exclusion count includes unavailable requirements.');
  perform test.assert(exists (
    select 1 from jsonb_array_elements(recommendation->'rows') r
    where r->>'course_offering_id' = offering->>'id' and r->'badges' ? 'By request'
  ), 'Recommendation includes actual offered courses and badges.');
  perform test.assert(not exists (
    select 1 from jsonb_array_elements(recommendation->'rows') r where r->>'course_offering_id' = blocked_offering->>'id'
  ), 'Unmet strict prerequisites exclude a recommendation.');

  select count(*) into attempt_count from public.attempt a where a.student_id = student;
  plan_body := jsonb_build_object('expected_revision', null, 'expected_curriculum_assignment_id', assignment,
    'items', jsonb_build_array(jsonb_build_object('course_offering_id', offering->>'id'),
      jsonb_build_object('course_offering_id', next_offering->>'id')));
  saved := public.matt_operation('saveAdvisingPlan', params, plan_body);
  plan_id := (saved->'plan'->>'id')::uuid;
  perform test.assert(saved->'plan'->>'created_by' = adviser::text and saved->'plan'->>'revision' = '1',
    'The initial plan stores the current adviser and revision.');
  perform test.assert(saved->'items'->0->>'course_offering_id' = offering->>'id'
    and saved->'items'->1->>'course_offering_id' = next_offering->>'id', 'Plan preserves requested ordering.');
  perform test.assert((select count(*) from public.attempt a where a.student_id = student) = attempt_count,
    'Saving recommendations never enrolls a student.');

  begin
    perform public.matt_operation('saveAdvisingPlan', params, plan_body);
    raise exception 'Stale plan revision was accepted.';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.matt_operation('saveAdvisingPlan', params, plan_body || jsonb_build_object(
      'expected_revision', 1, 'items', jsonb_build_array(jsonb_build_object('course_offering_id', blocked_offering->>'id'))));
    raise exception 'Plan accepted a course with unmet strict prerequisites.';
  exception when sqlstate 'PT400' then null;
  end;
  perform test.assert((select count(*) from public.advising_plan_item i where i.advising_plan_id = plan_id) = 2,
    'Ineligible edit leaves the old plan selections intact.');

  saved := public.matt_operation('saveAdvisingPlan', params, plan_body || '{"expected_revision":1,"items":[]}');
  perform test.assert(saved->'plan'->>'revision' = '2' and saved->'items' = '[]', 'Explicit edit can clear the term plan.');
  perform test.login(5);
  set local role authenticated;
  if (select count(*) from public.advising_plan) <> 1 then
    raise exception 'Student cannot read their saved plan.';
  end if;
  reset role;
  perform test.login(9);
  set local role authenticated;
  if (select count(*) from public.advising_plan) <> 0 then
    raise exception 'Another student can read the saved plan.';
  end if;
  reset role;
end
$$;
