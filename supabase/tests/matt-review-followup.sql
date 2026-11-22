do $$
declare
  staff uuid := '00000003-0000-4000-8000-000000000000';
  staff_session uuid := '00000003-0000-4000-8000-000000000001';
  head uuid := '00000002-0000-4000-8000-000000000000';
  head_session uuid := '00000002-0000-4000-8000-000000000001';
  admin uuid := '00000001-0000-4000-8000-000000000000';
  admin_session uuid := '00000001-0000-4000-8000-000000000001';
  target uuid := gen_random_uuid();
  dept uuid := (select (value->>'id')::uuid from test.records where name = 'department');
  faculty uuid := (select (value->>'id')::uuid from test.records where name = 'faculty');
  curriculum uuid := (select (value->>'id')::uuid from test.records where name = 'version');
  req jsonb;
  corrected jsonb;
  reservation jsonb;
  result jsonb;
  old_hash text;
  new_hash text;
begin
  insert into public.system_settings(department_id,warning_pct,probation_pct,dismissal_pct,sender_email)
  values (dept,25,50,75,'sender@example.test');
  perform test.login(3);
  perform test.assert(not exists(select 1 from saais_api.system_settings where department_id = dept),
    'Department staff cannot read department settings');
  perform test.login(2);
  perform test.assert(exists(select 1 from saais_api.system_settings where department_id = dept),
    'Department head can read department settings');

  req := jsonb_build_object('role','student','full_name','Recovery fixture',
    'email','recovery-fixture@vsu.edu.ph','student_number','26-1-99399',
    'program_id',(select value->>'id' from test.records where name='program'),
    'curriculum_version_id',curriculum,'adviser_id','00000004-0000-4000-8000-000000000000');
  reservation := public.saais_invitation_service('inviteUser','prepare',req,staff,staff_session);
  insert into auth.users(id,email,raw_app_meta_data) values
    (target,req->>'email',jsonb_build_object('saais_provisioning_id',reservation->>'reservation_id'));
  update public.profile set status='disabled' where id='00000004-0000-4000-8000-000000000000';
  begin
    perform public.saais_invitation_service('inviteUser','prepare',req,staff,staff_session);
    raise exception 'Ineligible adviser was accepted';
  exception when sqlstate 'PT409' then null; end;
  corrected := req || '{"adviser_id":"00000008-0000-4000-8000-000000000000"}'::jsonb;
  begin
    perform public.saais_invitation_service('inviteUser','prepare',corrected,head,head_session);
    raise exception 'Different staff actor modified reservation';
  exception when sqlstate 'PT409' then null; end;
  begin
    perform public.saais_invitation_service('inviteUser','prepare',corrected || '{"full_name":"Other name"}',staff,staff_session);
    raise exception 'Unrelated reservation input was changed';
  exception when sqlstate 'PT409' then null; end;
  result := public.saais_invitation_service('inviteUser','prepare',corrected,staff,staff_session);
  perform test.assert(result->>'reservation_id' = reservation->>'reservation_id' and result->>'auth_ready'='true',
    'Corrected adviser retains the exact reserved Auth identity');
  result := public.saais_invitation_service('inviteUser','finish',corrected,staff,staff_session,null,repeat('a',64));
  perform test.assert((result->>'profile_id')::uuid = target, 'Corrected reservation provisions the same identity');
  perform test.assert(exists(select 1 from public.adviser_assignment where student_id=target
    and adviser_id='00000008-0000-4000-8000-000000000000' and end_date is null), 'New eligible adviser assigned');
  update public.profile set status='active' where id='00000004-0000-4000-8000-000000000000';
  update public.curriculum_version set status='teach_out' where id=curriculum;
  result := public.saais_invitation_service('inviteUser','prepare',corrected,staff,staff_session);
  perform test.assert((result->>'profile_id')::uuid = target, 'Completed retry survives curriculum lifecycle change');
  update public.curriculum_version set status='active' where id=curriculum;

  insert into public.role_assignment(profile_id,role,faculty_id,department_id)
    values(target,'adviser',faculty,null);
  begin
    perform public.saais_invitation_service('resendAccountInvite','start','{}',staff,staff_session,target,repeat('b',64));
    raise exception 'Staff managed a faculty-wide adviser invitation';
  exception when sqlstate 'PT403' then null; end;
  old_hash := encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex');
  insert into saais_private.public_invitation_budget(operation,token_hash,window_start,count)
    values('previewInviteToken',old_hash,now(),60);
  perform public.saais_invitation_service('resendAccountInvite','start','{}',admin,admin_session,target,repeat('a',64));
  perform test.assert((select count=60 from saais_private.public_invitation_budget where token_hash=old_hash),
    'Admin can manage a faculty-wide grant and reusing the same token retains the budget');
  delete from public.role_assignment where profile_id=target and role='adviser';
  perform public.saais_invitation_service('resendAccountInvite','start','{}',admin,admin_session,target,repeat('b',64));
  new_hash := encode(sha256(convert_to(repeat('b',64),'UTF8')),'hex');
  perform test.assert(not exists(select 1 from saais_private.public_invitation_budget where token_hash in (old_hash,new_hash)),
    'Resending removes the old token budget');
  perform public.saais_invitation_service('previewInviteToken','admit','{}',p_token=>new_hash);
  perform test.assert((select count=1 from saais_private.public_invitation_budget where token_hash=new_hash),
    'Reissued token has a fresh budget');
end;
$$;

