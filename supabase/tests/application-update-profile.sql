begin;

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  admin uuid := '00000001-0000-4000-8000-000000000000';
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  dean uuid := '00000007-0000-4000-8000-000000000000';
  student_params jsonb := jsonb_build_object('profile_id', student);
  adviser_params jsonb := jsonb_build_object('profile_id', adviser);
  dean_params jsonb := jsonb_build_object('profile_id', dean);
  faculty uuid := (select (value->>'id')::uuid from test.records where name = 'faculty');
  other_faculty uuid := (select (value->>'id')::uuid from test.records where name = 'faculty_b');
  department uuid := (select (value->>'id')::uuid from test.records where name = 'department');
  dean_grant uuid := (select r.id from public.role_assignment r where r.profile_id = dean and r.role = 'dean');
  updated jsonb;
begin
  perform test.login(5);
  begin
    perform public.matt_operation('updateProfile', student_params, '{"full_name":"Self Edited"}');
    raise exception 'A student edited their profile.';
  exception when sqlstate 'PT403' then null;
  end;

  perform test.login(1);
  updated := public.matt_operation('updateProfile', student_params, '{"full_name":"Updated Student"}');
  perform test.assert(updated->>'full_name' = 'Updated Student' and updated->>'student_number' = 'TEST-5',
    'Admin can update permitted profile fields and leave the identity intact.');
  begin
    perform public.matt_operation('updateProfile', student_params, '{"student_number":"NEW-5"}');
    raise exception 'A student number with academic history changed.';
  exception when sqlstate 'PT409' then null;
  end;
  begin
    perform public.matt_operation('updateProfile', adviser_params, '{"role":"admin"}');
    raise exception 'The adviser role was removed while assignment history exists.';
  exception when sqlstate 'PT409' then null;
  end;

  begin
    perform public.matt_operation('updateProfile', jsonb_build_object('profile_id', admin), jsonb_build_object(
      'role_assignments', jsonb_build_array(jsonb_build_object('role','admin'),
        jsonb_build_object('role','dean','faculty_id',faculty))
    ));
    raise exception 'An administrator assigned an additional role to themself.';
  exception when sqlstate 'PT403' then null;
  end;
  begin
    perform public.matt_operation('updateProfile', dean_params, jsonb_build_object(
      'role_assignments', jsonb_build_array(jsonb_build_object('role','dean','faculty_id',faculty),
        jsonb_build_object('role','department_head','faculty_id',other_faculty,'department_id',department))
    ));
    raise exception 'An administrator accepted mismatching faculty and department roles.';
  exception when sqlstate 'PT400' then null;
  end;

  updated := public.matt_operation('updateProfile', dean_params, jsonb_build_object(
    'role_assignments', jsonb_build_array(jsonb_build_object('role','dean','faculty_id',faculty),
      jsonb_build_object('role','department_head','department_id',department))
  ));
  perform test.assert(updated->>'role' = 'dean' and updated->'roles' ? 'department_head'
    and exists(select 1 from public.role_assignment r where r.id = dean_grant)
    and exists(select 1 from public.role_assignment r where r.profile_id = dean
      and r.role = 'department_head' and r.faculty_id = faculty and r.department_id = department),
    'A second scoped role is added while the unchanged primary grant keeps its identity.');

  perform public.matt_operation('updateProfile', student_params, '{"status":"disabled"}');
  perform test.login(5);
  begin
    perform public.matt_operation('getHealthStatus');
    raise exception 'A disabled profile retained application access.';
  exception when sqlstate 'PT403' then null;
  end;
  perform test.login(1);
  updated := public.matt_operation('updateProfile', student_params, '{"status":"active"}');
  perform test.assert(updated->>'status' = 'active' and exists(
    select 1 from public.audit_log_entry a where a.actor_id = admin and a.entity_id = student
      and a.action = 'updateProfile' and a.old_value->>'status' = 'disabled' and a.new_value->>'status' = 'active'
  ), 'Reactivation of a previously active account has an immutable actor-linked audit event.');
end;
$$;

rollback;
