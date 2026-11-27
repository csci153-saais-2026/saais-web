begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

\ir ../tests/fixtures.sql
\ir ../tests/10_catalog.sql
\ir ../tests/15_people.sql
\ir ../tests/25_student_setup.sql

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  source uuid := (select (value->>'id')::uuid from test.records where name = 'source_attempt');
  original_course uuid := (select (value->>'id')::uuid from test.records where name = 'source_course');
  version uuid := (select (value->>'id')::uuid from test.records where name = 'version');
  late_course uuid;
  late_term uuid;
  late_offering uuid;
  retake_offering uuid;
begin
  update public.curriculum_version set delinquency_threshold = 3 where id = version;
  update public.attempt set status = 'failed', final_grade = 4 where id = source;
  insert into public.course (department_id, code, title, units)
    select department_id, 'INC101', 'Incomplete Course', 3 from public.course where id = original_course
    returning id into late_course;
  insert into public.school_term(start_year, end_year, term_type, ends_on)
    values (2097, 2098, '1st Semester', '2097-12-01') returning id into late_term;
  insert into public.course_offering(school_term_id, course_id)
    values (late_term, late_course) returning id into late_offering;
  insert into public.course_offering(school_term_id, course_id)
    values (late_term, original_course) returning id into retake_offering;
  insert into public.attempt(student_id, course_offering_id, status, units_attempted, inc_deadline, created_by, updated_by)
    values (student, late_offering, 'inc', 3, '2098-12-01', adviser, adviser),
      (student, retake_offering, 'currently_enrolled', 3, null, adviser, adviser);
end;
$$;

select is(saais_private.recompute_lapsed_inc_gwa('2098-11-30'), 0, 'No recomputation before the deadline');
select is(saais_private.recompute_lapsed_inc_gwa('2098-12-01'), 0, 'The INC deadline is inclusive');
select is(saais_private.recompute_lapsed_inc_gwa('2098-12-02'), 1, 'Daily job finds the lapse after the deadline');
select results_eq(
  'select cumulative_gwa, counted_units, failed_units, is_delinquent, lapsed_inc_count from saais_private.lapsed_inc_recomputation',
  'values (4.50::numeric, 6::numeric, 3::numeric, true, 1)', 'Recompute GWA and term delinquency, retaining the failed grade during enrollment');
select is(saais_private.recompute_lapsed_inc_gwa('2098-12-02'), 0, 'Retry does not invalidate again or add a duplicate');
select is((select count(*) from saais_private.lapsed_inc_recomputation), 1::bigint, 'One result per student and term');
select is((select status::text from public.attempt where inc_deadline = '2098-12-01'), 'inc',
  'Recompute preserves the recorded INC');

-- Complete the retake with its first numeric result.
update public.attempt set status = 'passed', final_grade = 2 where status = 'currently_enrolled';
select is(saais_private.recompute_lapsed_inc_gwa('2098-12-03'), 1, 'Recompute picks up the numeric retake');
select is((select cumulative_gwa from saais_private.lapsed_inc_recomputation), 3.50::numeric,
  'Numeric retake replaces the earlier failed result for GWA');
select ok((select effective.is_repeated
  from saais_private.matt_effective_attempts('00000005-0000-4000-8000-000000000000', '2098-12-03') effective
  join test.records fixture on fixture.name = 'source_attempt' and effective.attempt_id = (fixture.value->>'id')::uuid
  where effective.recorded_status = 'failed' and not effective.counts_toward_cumulative_gwa),
  'Original failing result remains on the transcript and is marked repeated');
select is(saais_private.recompute_lapsed_inc_gwa('2098-12-02'), 0, 'A stale retry cannot overwrite the latest snapshot');

set local role authenticated;
select throws_ok('select public.recompute_lapsed_inc_gwa()', '42501', null, 'Browser users cannot run the daily job');
reset role;
select ok(has_function_privilege('service_role', 'public.recompute_lapsed_inc_gwa()', 'EXECUTE'),
  'The service role can run the scheduled routine');

select * from finish();
rollback;
