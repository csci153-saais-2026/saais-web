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
begin
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
  perform test.assert(jsonb_typeof(result->'record'->'available_terms')='array'
    and result->'record' ? 'attempts_truncated',
    'Assistant context must include offering information and data completeness.');

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
