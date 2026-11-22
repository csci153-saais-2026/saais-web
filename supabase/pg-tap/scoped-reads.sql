begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

\ir ../tests/fixtures.sql
\ir ../tests/10_catalog.sql
\ir ../tests/15_people.sql
\ir ../tests/25_student_setup.sql

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

select test.login(5);
set local role authenticated;
select results_eq('select body_text from saais_api.advising_note order by body_text',
  array['Archived note', 'Current note'], 'Student can read both of their notes including the archived note');
select is_empty('select id from saais_api.attempt_remark', 'Attempt remarks are staff-only');
select is_empty('select id from saais_api.profile where id <> auth.uid()', 'Student cannot read another profile');
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Student can read own organization');
select is((select count(*) from saais_api.attempt_result where recorded_status = 'passed'), 1::bigint,
  'Student can read the projected result for their own course');
select is_empty('select id from saais_api.audit_log_entry', 'Student cannot read audit data');
select throws_ok('select reason from public.adviser_assignment', '42501', null,
  'Base assignment cannot reveal the internal reason');
select throws_ok('select entry_year from public.profile', '42501', null,
  'Base profile cannot bypass projected fields');
select throws_ok('select created_by from saais_api.attempt_result', '42703', null,
  'Attempt result does not publish the raw author columns');
select is_empty('select id from saais_api.notification where recipient_id <> auth.uid()', 'Student notifications are private');
reset role;

select test.login(4);
set local role authenticated;
select is((select count(*) from saais_api.advising_note), 2::bigint, 'Current adviser sees assigned notes');
select is((select count(*) from saais_api.attempt_remark), 1::bigint, 'Current adviser sees assigned attempt remarks');
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Adviser sees only their assigned student');
reset role;

select test.login(2);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Head sees only department students');
select is((select count(*) from saais_api.advising_note), 2::bigint, 'Head can read in-scope notes');
select is((select count(*) from saais_api.attempt_remark), 1::bigint, 'Head sees in-scope remarks');
select is_empty('select id from saais_api.audit_log_entry where old_value is not null or new_value is not null',
  'Head sees audited action metadata without raw audit snapshots');
reset role;

select test.login(3);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Staff can read only department students');
select is((select count(*) from saais_api.role_assignment where role = 'adviser'), 2::bigint,
  'Staff can populate adviser options within their department');
select is_empty('select id from saais_api.advising_note', 'Staff has no advising-note read access');
select is_empty('select id from saais_api.attempt_remark', 'Staff has no attempt-remark read access');
reset role;

select test.login(7);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 1::bigint, 'Dean can read only faculty students');
select is_empty('select id from saais_api.advising_note', 'Dean cannot read advising notes');
select is_empty('select id from saais_api.attempt_remark', 'Dean cannot read attempt remarks');
reset role;

select test.login(1);
set local role authenticated;
select is((select count(*) from saais_api.student_organization), 2::bigint, 'Admin sees students from both departments');
select is((select count(*) from saais_api.advising_note), 3::bigint, 'Admin can read both departments’ notes');
select is_empty('select id from saais_api.notification where recipient_id <> auth.uid()', 'Admin notifications remain account-specific');
reset role;

select test.login(10);
set local role authenticated;
select is_empty('select id from saais_api.profile', 'Disabled user sees no profiles');
select is_empty('select id from saais_api.course', 'Disabled user sees no catalog');
reset role;
set local role anon;
select throws_ok('select id from saais_api.profile', '42501', null, 'Anonymous user has no projection access');
reset role;

select test.login(2);
select lives_ok($cmd$
  select public.matt_operation('reassignAdviser', '{"student_id":"00000005-0000-4000-8000-000000000000"}',
    '{"adviser_id":"00000008-0000-4000-8000-000000000000","start_date":"2026-02-01","reason":"Scoped handoff"}')
$cmd$, 'Head can reassign an eligible adviser');
set constraints all immediate;
select is((select count(*) from public.adviser_assignment
  where student_id = '00000005-0000-4000-8000-000000000000' and end_date is null),
  1::bigint, 'Reassignment leaves one open assignment');
select is((select before.end_date from public.adviser_assignment before
  join public.adviser_assignment after on after.student_id = before.student_id and after.end_date is null
  where before.student_id = '00000005-0000-4000-8000-000000000000' and before.end_date is not null),
  '2026-02-01'::date, 'Reassignment leaves no gap');
select test.login(4);
set local role authenticated;
select is((select count(*) from saais_api.advising_note), 2::bigint, 'Former adviser retains historical read access');
select throws_ok($cmd$
  select public.matt_operation('addAdvisingNote', '{"student_id":"00000005-0000-4000-8000-000000000000"}',
    '{"body_text":"Former adviser edit"}')
$cmd$, 'PT403', null, 'Former adviser cannot add a note for the handed-over student');
reset role;
select test.login(8);
set local role authenticated;
select is((select count(*) from saais_api.adviser_assignment where end_date is null), 2::bigint,
  'New adviser can read their current advisees in both departments');
reset role;

select * from finish();
rollback;
