begin;

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  incoming uuid := '00000008-0000-4000-8000-000000000000';
  request_body jsonb := '{"message":"What is the recorded GWA?"}';
  result jsonb;
  previous_budget bigint;
  denied boolean;
  expected_course text;
  source_course uuid := (select (value->>'id')::uuid from test.records where name='source_course');
  curriculum_course uuid := (select (value->>'id')::uuid from test.records where name='course');
  v_school_term uuid := (select (value->>'id')::uuid from test.records where name='school_term');
  test_department uuid := (select (value->>'id')::uuid from test.records where name='department');
  inactive_course uuid;
  offering_count integer;
begin
  update public.school_term set ends_on=greatest(ends_on, current_date + 365) where id=v_school_term;
  insert into public.prerequisite(course_id, prerequisite_course_id, type)
    values(curriculum_course, source_course, 'strict');
  perform test.login(4);
  result := public.matt_assistant_context(student, request_body);
  perform test.assert(result->'record' ? 'gwa' and result->>'grounded_at' is not null,
    'The current adviser can retrieve grounded academic context.');
  perform test.assert(not (result->'record' ? 'student_id') and not (result->'record' ? 'full_name')
    and not (result->'record' ? 'email') and not (result->'record' ? 'notes'),
    'Assistant context excludes identity and private notes.');
  select c.code into expected_course
  from public.curriculum_term_course s
  join public.curriculum_term t on t.id=s.curriculum_term_id
  join public.course c on c.id=s.course_id
  where t.curriculum_version_id=(saais_private.organization(student)->>'curriculum_version_id')::uuid
  order by t.year_level, t.term_sequence, c.code limit 1;
  perform test.assert(expected_course is not null and exists (
    select 1 from jsonb_array_elements(result->'record'->'curriculum'->'courses') course
    where course->>'course_code'=expected_course and course ? 'prerequisites'
  ), 'Assistant context must include the assigned curriculum and prerequisites.');
  perform test.assert(exists (
    select 1 from jsonb_array_elements(result->'record'->'curriculum'->'courses') course,
      jsonb_array_elements(course->'prerequisites') prereq
    where course->>'course_code'=expected_course and prereq->>'course_code'='SRC101'
  ), 'Assistant context must include the known prerequisite.');
  perform test.assert(exists (
    select 1 from jsonb_array_elements(result->'record'->'available_terms') term,
      jsonb_array_elements(term->'offered_courses') offering
    where offering->>'course_code'=expected_course
  ) and result->'record' ? 'attempts_truncated',
    'Assistant context must include the known offering and data completeness.');

  select count(*) into offering_count from public.course_offering o
    join public.course c on c.id=o.course_id where o.school_term_id=v_school_term and c.status='active';
  insert into public.course_offering(school_term_id, course_id, section)
    select v_school_term, curriculum_course, 'assistant-test-' || n
    from generate_series(1, 200-offering_count) n;
  insert into public.course(department_id,code,title,units,status)
    values(test_department,'ASSIST-INACTIVE','Inactive test course',3,'discontinued') returning id into inactive_course;
  insert into public.course_offering(school_term_id, course_id) values(v_school_term,inactive_course);
  result := public.matt_assistant_context(student, request_body);
  perform test.assert(exists (select 1 from jsonb_array_elements(result->'record'->'available_terms') term
    where term->>'school_year'=(select school_year from public.school_term where id=v_school_term)
      and term->>'term_type'=(select term_type::text from public.school_term where id=v_school_term)
      and (term->>'offerings_truncated')::boolean=false
      and jsonb_array_length(term->'offered_courses')=200),
    'An inactive offering must not mark 200 active offerings truncated.');
  insert into public.course_offering(school_term_id, course_id, section)
    values(v_school_term,curriculum_course,'assistant-test-extra');
  result := public.matt_assistant_context(student, request_body);
  perform test.assert(exists (select 1 from jsonb_array_elements(result->'record'->'available_terms') term
    where term->>'school_year'=(select school_year from public.school_term where id=v_school_term)
      and term->>'term_type'=(select term_type::text from public.school_term where id=v_school_term)
      and (term->>'offerings_truncated')::boolean=true
      and jsonb_array_length(term->'offered_courses')=200),
    'More than 200 active offerings must be marked truncated.');

  perform test.login(2);
  perform public.matt_operation('reassignAdviser', jsonb_build_object('student_id', student),
    jsonb_build_object('adviser_id', incoming, 'start_date', '2026-02-01', 'reason', 'Assistant authorization handoff'));

  perform test.login(4);
  select coalesce(sum(request_count), 0) into previous_budget from saais_private.matt_assistant_budget;
  denied := false;
  begin
    perform public.matt_assistant_context(student, request_body);
  exception when sqlstate 'PT403' then denied := true;
  end;
  perform test.assert(denied, 'A former adviser retained assistant context access after reassignment.');
  perform test.assert((select coalesce(sum(request_count), 0) from saais_private.matt_assistant_budget) = previous_budget,
    'An unauthorized adviser consumed provider budget.');

  perform test.login(8);
  result := public.matt_assistant_context(student, request_body);
  perform test.assert(result->'record' ? 'gwa', 'The newly assigned adviser cannot retrieve context.');

  update saais_private.matt_assistant_budget set request_count=300
    where actor_id='00000000-0000-0000-0000-000000000000' and window_type='project_day'
      and window_start=date_trunc('day', statement_timestamp(), 'UTC');
  denied := false;
  begin
    perform public.matt_assistant_context(student, request_body);
  exception when sqlstate 'PT429' then denied := true;
  end;
  perform test.assert(denied, 'An exhausted project budget must reject the request.');

  perform test.login(5);
  denied := false;
  begin
    perform public.matt_assistant_context(student, request_body);
  exception when sqlstate 'PT403' then denied := true;
  end;
  perform test.assert(denied, 'Students cannot invoke the adviser assistant.');
end;
$$;

rollback;
