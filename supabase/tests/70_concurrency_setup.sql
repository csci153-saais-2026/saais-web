do $$declare slot jsonb; term uuid;
begin
  perform test.login(1);
  select t.id into term from public.curriculum_term t where t.curriculum_version_id=(select (value->>'id')::uuid from test.records where name='target_version') limit 1;
  slot:=test.call('createCurriculumTermCourse','{}',jsonb_build_object('curriculum_term_id',term,'is_elective_slot',true,'slot_label','Concurrency Test','nominal_units',3));
  insert into test.records values('race_slot',slot);
end$$;

insert into auth.users(id) values ('00000019-0000-4000-8000-000000000000');
insert into public.profile(id, role, email, full_name, status, student_number)
values ('00000019-0000-4000-8000-000000000000','student','reassign-race@example.test','Reassignment fixture','active','TEST-RACE');
insert into public.role_assignment(profile_id, role)
values ('00000019-0000-4000-8000-000000000000','student');
insert into public.student_curriculum_assignment(student_id, curriculum_version_id, start_date, reason)
select '00000019-0000-4000-8000-000000000000', (value->>'id')::uuid, '2026-01-01', 'Initial assignment'
from test.records where name = 'version';
insert into public.adviser_assignment(student_id, adviser_id, start_date, reason)
values ('00000019-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000','2026-01-01','Initial assignment');
