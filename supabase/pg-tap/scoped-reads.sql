begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select ok(
  (select reloptions @> array['security_invoker=true', 'security_barrier=true']
   from pg_class where oid = 'saais_api.attempt_result'::regclass),
  'Attempt result uses caller privileges and retains its security barrier'
);
select is((select count(*) from pg_class where oid in (
  'saais_api.program'::regclass, 'saais_api.course'::regclass,
  'saais_api.prerequisite'::regclass, 'saais_api.course_offering'::regclass
) and reloptions @> array['security_invoker=true', 'security_barrier=true']), 4::bigint,
  'Catalog views use caller privileges and retain security barriers');
select is((select count(*) from pg_class where oid in (
  'saais_api.student_curriculum_assignment'::regclass, 'saais_api.attempt'::regclass,
  'saais_api.inc_resolution'::regclass, 'saais_api.elective_mapping'::regclass,
  'saais_api.equivalency_decision'::regclass, 'saais_api.outside_credit'::regclass,
  'saais_api.advising_note'::regclass, 'saais_api.grade_flag'::regclass,
  'saais_api.attempt_remark'::regclass
) and reloptions @> array['security_invoker=true', 'security_barrier=true']), 9::bigint,
  'Single-table student record views use caller privileges and retain security barriers');
select is((select count(*) from pg_class where oid in (
  'saais_api.curriculum_term'::regclass, 'saais_api.curriculum_pair_equivalence'::regclass,
  'saais_api.advising_plan'::regclass, 'saais_api.advising_plan_item'::regclass,
  'saais_api.notification'::regclass
) and reloptions @> array['security_invoker=true', 'security_barrier=true']), 5::bigint,
  'Curriculum, plan, and notification views use caller privileges and retain security barriers');
select is((select count(*) from pg_class where oid in (
  'saais_api.curriculum_term_course'::regclass, 'saais_api.role_assignment'::regclass
) and reloptions @> array['security_invoker=true', 'security_barrier=true']), 2::bigint,
  'Curriculum course and role assignment views use caller privileges and retain security barriers');
select is((select count(*) from pg_class where oid in (
  'saais_api.faculty'::regclass, 'saais_api.department'::regclass
) and reloptions @> array['security_invoker=true', 'security_barrier=true']), 2::bigint,
  'Faculty and department views use caller privileges and retain security barriers');
select is((select count(*) from pg_class where oid in (
  'saais_api.curriculum_version'::regclass, 'saais_api.student_organization'::regclass
) and reloptions @> array['security_invoker=true', 'security_barrier=true']), 2::bigint,
  'Curriculum version and student organization use caller privileges and retain security barriers');
select ok((select reloptions @> array['security_invoker=true', 'security_barrier=true']
  from pg_class where oid = 'saais_api.profile'::regclass),
  'Profile uses caller privileges and retains its security barrier');
select ok((select reloptions @> array['security_invoker=true', 'security_barrier=true']
  from pg_class where oid = 'saais_api.adviser_assignment'::regclass),
  'Adviser assignment uses caller privileges and retains its security barrier');
select is((select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'saais_api' and c.relkind = 'v'
    and not coalesce(c.reloptions @> array['security_invoker=true', 'security_barrier=true'], false)),
  0::bigint, 'Every API view uses caller privileges and retains its security barrier');

\ir ../tests/fixtures.sql
\ir ../tests/10_catalog.sql
\ir ../tests/15_people.sql
\ir ../tests/25_student_setup.sql

with term as (
  insert into public.school_term(start_year, end_year, term_type, ends_on)
  values (2096, 2097, '1st Semester', '2096-12-01') returning id
), offering as (
  insert into public.course_offering(school_term_id, course_id)
  select term.id, (select (value->>'id')::uuid from test.records where name = 'source_course') from term
  returning id, school_term_id
)
insert into test.records select 'passed_retake_offering', to_jsonb(offering) from offering;
select test.login(4);
select throws_ok(format(
  'select public.matt_operation(%L, %L::jsonb, %L::jsonb)', 'recordGrades',
  '{"student_id":"00000005-0000-4000-8000-000000000000"}',
  (select jsonb_build_object('school_term_id', value->>'school_term_id',
    'course_offering_id', value->>'id', 'confirmed_enrollment', true)::text
    from test.records where name = 'passed_retake_offering')),
  'PT409', null, 'An adviser cannot enroll a student again in an already passed course');

insert into public.advising_note(student_id, authored_by, body_text, is_archived, archived_at, archived_by)
select student, adviser, message, archived,
  case when archived then now() end, case when archived then adviser end
from (values
  ('00000005-0000-4000-8000-000000000000'::uuid, '00000004-0000-4000-8000-000000000000'::uuid, 'Current note', false),
  ('00000005-0000-4000-8000-000000000000', '00000004-0000-4000-8000-000000000000', 'Archived note', true),
  ('00000009-0000-4000-8000-000000000000', '00000008-0000-4000-8000-000000000000', 'Other department note', false)
) notes(student, adviser, message, archived);
insert into public.attempt_remark(student_id, authored_by, body_text, attempt_id)
select student_id, created_by, 'Private attempt remark', id from public.attempt;
insert into public.notification(recipient_id, kind, event_type, title, body)
select id, 'person', 'adviser_assigned', 'Fixture notice', 'Fixture body'
from public.profile where status = 'active';
insert into public.curriculum_transfer_request(student_id, from_curriculum_version_id,
  to_curriculum_version_id, endorsed_by, endorsement_note)
select '00000005-0000-4000-8000-000000000000',
  (select (value->>'id')::uuid from test.records where name = 'version'),
  (select (value->>'id')::uuid from test.records where name = 'version_b'),
  '00000004-0000-4000-8000-000000000000', 'Fixture transfer';

insert into public.audit_log_entry (actor_name, student_id, action, entity_type, entity_id, old_value, new_value)
select 'Correction fixture actor', student_id, 'correctGrades', 'attempt', id,
  '{"final_grade": 2.5}', '{"final_grade": 2}'
from public.attempt;
select is((select jsonb_array_length(saais_private.matt_grade_fix_history(id)) from public.attempt), 1,
  'Fixture has actual correction history');
insert into public.attempt(student_id, course_offering_id, status, final_grade, units_attempted, created_by, updated_by)
select '00000009-0000-4000-8000-000000000000',
  (select (value->>'id')::uuid from test.records where name = 'source_offering'),
  'passed', 1.75, 3, '00000008-0000-4000-8000-000000000000', '00000008-0000-4000-8000-000000000000';

select set_config('test.other_audit', (select id::text from public.audit_log_entry
  where student_id = '00000005-0000-4000-8000-000000000000' and old_value is not null limit 1), true);
select set_config('test.other_assignment', (select id::text from public.adviser_assignment
  where student_id = '00000009-0000-4000-8000-000000000000' limit 1), true);
select set_config('test.transfer', (select id::text from public.curriculum_transfer_request
  where student_id = '00000005-0000-4000-8000-000000000000' limit 1), true);
select test.login(5);
set local role authenticated;
select is((select count(*) from saais_api.course), (select count(*) from public.course),
  'Active student sees the same catalog through the view and underlying table');
select results_eq('select body_text from saais_api.advising_note order by body_text',
  array['Archived note', 'Current note'], 'Student can read both of their notes including the archived note');
select is_empty('select id from saais_api.attempt_remark', 'Attempt remarks are staff-only');
select is_empty('select id from public.attempt_remark', 'Direct table reads also keep remarks staff-only');
select is_empty('select id from public.attempt where student_id <> auth.uid()', 'Direct attempt reads exclude other students');
select is_empty('select id from public.advising_plan where student_id <> auth.uid()', 'Direct plan reads exclude other students');
select is((select adviser_name from saais_api.adviser_assignment where end_date is null), 'Person 4',
  'Student still receives their adviser name');
select is_empty('select * from saais_private.assignment_display(current_setting(''test.other_assignment'')::uuid)',
  'Assignment helper does not reveal an inaccessible assignment');
select is(saais_private.organization_entry_year('00000009-0000-4000-8000-000000000000'::uuid), null::integer,
  'Organization helper does not reveal another student entry year');
select is_empty('select id from public.notification where recipient_id <> auth.uid()', 'Direct notification reads exclude other recipients');
select is((select endorsed_by_name from saais_api.curriculum_transfer_request), 'Person 4',
  'Student can read their transfer endorser');
select is((select dean_name from saais_api.faculty where dean_name is not null limit 1),
  'Person 7', 'Faculty projection retains the dean name');
select throws_ok('select reason from public.inc_resolution', '42501', null, 'Direct INC reads cannot expose the hidden reason');
select is_empty('select id from saais_api.profile where id <> auth.uid()', 'Student cannot read another profile');
select is_empty('select id from public.profile where id <> auth.uid()', 'Student cannot bypass profile scope through the table');
select is(saais_private.profile_role_list('00000009-0000-4000-8000-000000000000'::uuid), null::public.role_type[],
  'Profile role helper does not reveal another student roles');
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Student can read own organization');
select is((select count(*) from saais_api.attempt_result where recorded_status = 'passed'), 1::bigint,
  'Student can read the projected result for their own course');
select is_empty('select id from saais_api.attempt_result where student_id <> auth.uid()', 'Student cannot read another student result');
select is((select final_grade from saais_api.attempt_result), 2::numeric,
  'Student can read the approved grade');
select ok((select not (to_jsonb(result) ? 'grade_fix_history')
  from (select * from saais_api.attempt_result) result), 'Wildcard view reads omit correction history');
select throws_ok('select grade_fix_history from saais_api.attempt_result', '42703', null,
  'Correction history cannot be selected from the view');
select is((select r from saais_private.read_attempt_results(auth.uid()) r),
  (select to_jsonb(r) from saais_api.attempt_result r), 'Direct projection helper returns exactly the safe view fields');
select throws_ok('select saais_private.matt_grade_fix_history(auth.uid())', '42501', null,
  'Student cannot execute the underlying correction-history helper');
select throws_ok('select saais_private.matt_attempt_result(auth.uid())', '42501', null,
  'Student cannot execute the internal mutation response helper');
select is_empty('select id from saais_api.audit_log_entry', 'Student cannot read audit data');
select is_empty('select * from saais_private.audit_display(current_setting(''test.other_audit'')::uuid)',
  'Student cannot read audit display data through the helper');
select throws_ok('select reason from public.adviser_assignment', '42501', null,
  'Base assignment cannot reveal the internal reason');
select throws_ok('select entry_year from public.profile', '42501', null,
  'Base profile cannot bypass projected fields');
select throws_ok('select created_by from saais_api.attempt_result', '42703', null,
  'Attempt result does not publish the raw author columns');
select is_empty('select id from saais_api.notification where recipient_id <> auth.uid()', 'Student notifications are private');
reset role;

select test.login(9);
set local role authenticated;
select is((select count(*) from saais_api.attempt_result), 1::bigint, 'Second student reads only their own attempt result');
select is_empty('select id from saais_api.attempt_result where student_id <> auth.uid()', 'Second student cannot read the first student result');
select is_empty('select id from saais_api.curriculum_transfer_request', 'Other student cannot read the transfer');
select is_empty('select * from saais_private.transfer_names(current_setting(''test.transfer'')::uuid)',
  'Other student cannot read transfer names through the helper');
select is_empty($cmd$select * from saais_private.read_attempt_results('00000005-0000-4000-8000-000000000000')$cmd$,
  'A different student cannot call the direct helper for a known attempt');
reset role;

select test.login(4);
set local role authenticated;
select is((select count(*) from saais_api.advising_note), 2::bigint, 'Current adviser sees assigned notes');
select is((select count(*) from saais_api.attempt_result), 1::bigint, 'Current adviser retains scoped result access');
select is((select count(*) from saais_api.attempt_remark), 1::bigint, 'Current adviser sees assigned attempt remarks');
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Adviser sees only their assigned student');
reset role;

select test.login(2);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Head sees only department students');
select is((select count(*) from saais_api.attempt_result), 1::bigint, 'Head can read in-scope results');
select is((select count(*) from saais_api.advising_note), 2::bigint, 'Head can read in-scope notes');
select is((select count(*) from saais_api.attempt_remark), 1::bigint, 'Head sees in-scope remarks');
select is_empty('select id from saais_api.audit_log_entry where old_value is not null or new_value is not null',
  'Head sees audited action metadata without raw audit snapshots');
select throws_ok('select old_value from public.audit_log_entry', '42501', null,
  'Head cannot bypass the audit snapshot restriction through the base table');
select is_empty('select * from saais_private.audit_display(current_setting(''test.other_audit'')::uuid) where old_value is not null or new_value is not null',
  'Head cannot retrieve audit snapshots through the helper');
reset role;

select test.login(3);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Staff can read only department students');
select is((select count(*) from saais_api.role_assignment where role = 'adviser'), 2::bigint,
  'Staff can populate adviser options within their department');
select is((select count(*) from saais_api.attempt_result), 1::bigint, 'Staff can read in-scope results');
select is_empty('select id from saais_api.advising_note', 'Staff has no advising-note read access');
select is_empty('select id from public.advising_note', 'Staff cannot bypass the advising-note view');
select is_empty('select id from saais_api.attempt_remark', 'Staff has no attempt-remark read access');
reset role;

select test.login(7);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Dean can read only faculty students');
select is((select count(*) from saais_api.attempt_result), 1::bigint, 'Dean can read in-scope results');
select is_empty('select id from saais_api.advising_note', 'Dean cannot read advising notes');
select is_empty('select id from saais_api.attempt_remark', 'Dean cannot read attempt remarks');
reset role;

select test.login(1);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 2::bigint, 'Admin sees students from both departments');
select is((select count(*) from saais_api.attempt_result), 2::bigint, 'Admin can read results');
select is((select count(*) from saais_api.advising_note), 3::bigint, 'Admin can read both departments’ notes');
select ok((select count(*) > 0 from saais_api.audit_log_entry where old_value is not null),
  'Admin can still read scoped audit snapshots');
select is_empty('select id from saais_api.notification where recipient_id <> auth.uid()', 'Admin notifications remain account-specific');
reset role;

select test.login(10);
set local role authenticated;
select is_empty('select id from saais_api.profile', 'Disabled user sees no profiles');
select is_empty('select id from saais_api.course', 'Disabled user sees no catalog');
select is_empty('select id from public.course', 'Disabled user cannot bypass the catalog view');
select is_empty('select id from public.faculty', 'Disabled user cannot read the faculty catalog');
select is_empty('select id from saais_api.attempt_result', 'Disabled user sees no attempt results');
reset role;
set local role anon;
select throws_ok('select id from saais_api.profile', '42501', null, 'Anonymous user has no projection access');
select throws_ok('select id from saais_api.attempt_result', '42501', null, 'Anonymous user has no result access');
reset role;

select test.login(2);
set local role authenticated;
select lives_ok($cmd$
  select public.matt_operation('reassignAdviser', '{"student_id":"00000005-0000-4000-8000-000000000000"}',
    '{"adviser_id":"00000008-0000-4000-8000-000000000000","start_date":"2026-02-01","reason":"Scoped handoff"}')
$cmd$, 'Head can reassign an eligible adviser');
set constraints all immediate;
select is((select reason from saais_api.audit_log_entry where action='reassignAdviser'
  and student_id='00000005-0000-4000-8000-000000000000'),
  'Scoped handoff'::text, 'Department head retains access to the scoped reassignment reason');
reset role;
select is((select count(*) from public.adviser_assignment
  where student_id = '00000005-0000-4000-8000-000000000000' and end_date is null),
  1::bigint, 'Reassignment leaves one open assignment');
select throws_ok($cmd$
  insert into public.adviser_assignment(adviser_id, student_id, start_date, reason)
  values ('00000004-0000-4000-8000-000000000000', '00000005-0000-4000-8000-000000000000', '2026-03-01', 'Duplicate assignment')
$cmd$, '23505', null, 'A student cannot have two active adviser assignments');
select is((select before.end_date from public.adviser_assignment before
  join public.adviser_assignment after on after.student_id = before.student_id and after.end_date is null
  where before.student_id = '00000005-0000-4000-8000-000000000000' and before.end_date is not null),
  '2026-02-01'::date, 'Reassignment leaves no gap');
select test.login(4);
set local role authenticated;
select is((select count(*) from saais_api.advising_note), 2::bigint, 'Former adviser retains historical read access');
select ok((select count(*) = 1 and bool_and(reason is null and details_summary <> 'Scoped handoff')
  from saais_api.audit_log_entry where action='reassignAdviser' and student_id='00000005-0000-4000-8000-000000000000'),
  'Former adviser cannot read the private reassignment reason');
select throws_ok('select reason from public.audit_log_entry', '42501', null, 'Base table cannot bypass reason redaction');
select throws_ok($cmd$
  select public.matt_operation('addAdvisingNote', '{"student_id":"00000005-0000-4000-8000-000000000000"}',
    '{"body_text":"Former adviser edit"}')
$cmd$, 'PT403', null, 'Former adviser cannot add a note for the handed-over student');
reset role;
select test.login(8);
set local role authenticated;
select ok((select count(*) = 1 and bool_and(reason is null and details_summary <> 'Scoped handoff')
  from saais_api.audit_log_entry where action='reassignAdviser' and student_id='00000005-0000-4000-8000-000000000000'),
  'Incoming adviser cannot read the private reassignment reason');
select is((select count(*) from saais_api.adviser_assignment where end_date is null), 2::bigint,
  'New adviser can read their current advisees in both departments');
reset role;

select * from finish();
rollback;
