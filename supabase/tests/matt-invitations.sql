do $$
declare
  admin uuid := '00000001-0000-4000-8000-000000000000';
  admin_session uuid := '00000001-0000-4000-8000-000000000001';
  staff uuid := '00000003-0000-4000-8000-000000000000';
  staff_session uuid := '00000003-0000-4000-8000-000000000001';
  target uuid := gen_random_uuid();
  token text := repeat('a', 64);
  new_token text := repeat('b', 64);
  reservation jsonb;
  request jsonb;
  result jsonb;
  hash text;
  lease uuid := gen_random_uuid();
begin
  request := jsonb_build_object('role','student','full_name','Provisioned fixture',
    'email','backend-fixture@vsu.edu.ph','student_number','26-1-99342',
    'program_id',(select value->>'id' from test.records where name='program'),
    'curriculum_version_id',(select value->>'id' from test.records where name='version'),
    'adviser_id','00000004-0000-4000-8000-000000000000');

  begin
    perform public.saais_invitation_service('inviteUser', 'prepare',
      '{"role":"admin","full_name":"Forbidden","email":"forbidden-fixture@vsu.edu.ph"}', staff, staff_session);
    raise exception 'Staff invited an admin';
  exception when sqlstate 'PT403' then null;
  end;
  begin
    perform public.saais_invitation_service('inviteUser', 'prepare',
      request || '{"adviser_id":"00000007-0000-4000-8000-000000000000"}', staff, staff_session);
    raise exception 'Student invitation accepted an ineligible adviser';
  exception when sqlstate 'PT409' then null;
  end;

  perform test.login(1);
  select grants into result from saais_private.validate_invitee(jsonb_build_object(
    'role', 'adviser', 'email', 'multirole-fixture@vsu.edu.ph', 'full_name', 'Multi-role fixture',
    'department_id', (select value->>'id' from test.records where name = 'department'),
    'faculty_id', (select value->>'id' from test.records where name = 'faculty'),
    'role_assignments', jsonb_build_array(
      jsonb_build_object('role', 'admin', 'department_id', (select value->>'id' from test.records where name = 'department')),
      jsonb_build_object('role', 'dean', 'department_id', (select value->>'id' from test.records where name = 'department'))
    )));
  perform test.assert(result @> '[{"role":"admin","department_id":null,"faculty_id":null}]',
    'Institution-wide secondary role normalizes the selected department');
  perform test.assert(result @> jsonb_build_array(jsonb_build_object(
    'role','dean','department_id',null,'faculty_id',(select value->>'id' from test.records where name = 'faculty')
  )), 'Dean secondary role uses the selected faculty');

  reservation := public.saais_invitation_service('inviteUser', 'prepare', request, staff, staff_session);
  perform test.assert(reservation->>'reservation_id' is not null and reservation->>'auth_ready' = 'false',
    'Prepare reserves a student without making academic writes');
  insert into auth.users(id, email, raw_app_meta_data)
  values (target, request->>'email', jsonb_build_object('saais_provisioning_id', reservation->>'reservation_id'));
  result := public.saais_invitation_service('inviteUser', 'finish', request, staff, staff_session, null, token);
  perform test.assert((result->>'profile_id')::uuid = target, 'Finish attaches the reserved Auth identity');
  perform test.assert(exists(select 1 from public.adviser_assignment where student_id = target and end_date is null)
    and exists(select 1 from public.student_curriculum_assignment where student_id = target and end_date is null)
    and exists(select 1 from public.audit_log_entry where entity_id = target and action = 'inviteUser'),
    'Initial adviser, curriculum, and audit commit together');
  perform public.saais_invitation_service('inviteUser', 'finish', request, staff, staff_session, null, token);
  perform test.assert((select count(*) = 1 from saais_private.invite_email where profile_id = target),
    'Identical retries do not queue another invitation');
  perform test.assert(not exists(select 1 from public.saais_claim_email(array['unapproved@example.test'])
    where kind = 'invitation'), 'Unapproved invitations do not reach the provider');
  perform test.assert((select m.attempts = 0 and m.lease is null from saais_private.invite_email m where m.profile_id = target),
    'An unapproved invitation retains its token and delivery attempts');
  perform test.assert(exists(select 1 from public.saais_claim_email(array[request->>'email'])
    where kind = 'invitation' and email = request->>'email'), 'Corrected allowlist can lease the held invitation');

  begin
    perform public.saais_invitation_service('inviteUser', 'prepare', request || '{"email":"other-fixture@vsu.edu.ph"}', staff, staff_session);
    raise exception 'Duplicate student number was accepted';
  exception when sqlstate 'PT409' then null;
  end;

  hash := encode(sha256(convert_to(token, 'UTF8')), 'hex');
  result := public.saais_invitation_service('previewInviteToken', 'start', jsonb_build_object('token',hash), p_token => hash);
  perform test.assert(result->>'valid' = 'true' and result->>'email' = request->>'email', 'Preview can read a live invitation');
  update public.profile set invitation_expires_at = now() - interval '1 second' where id = target;
  result := public.saais_invitation_service('previewInviteToken', 'start', jsonb_build_object('token',hash), p_token => hash);
  perform test.assert(result->>'status' = 'expired' and result->>'valid' = 'false', 'Expired invitation is inactive');
  perform test.assert(saais_private.matt_profile(target)->>'invitation_status' = 'expired', 'The account directory reports expired invitations');
  perform public.saais_invitation_service('resendAccountInvite', 'start', '{}', staff, staff_session, target, new_token);
  begin
    perform public.saais_invitation_service('previewInviteToken', 'start', jsonb_build_object('token',hash), p_token => hash);
    raise exception 'Resend retained the old token';
  exception when sqlstate 'PT404' then null;
  end;
  hash := encode(sha256(convert_to(new_token, 'UTF8')), 'hex');
  result := public.saais_invitation_service('declineInviteToken', 'start', jsonb_build_object('token',hash), p_token => hash);
  perform test.assert(result->>'invitation_status' = 'declined', 'A pending recipient can decline');
  perform public.saais_invitation_service('resendAccountInvite', 'start', '{}', staff, staff_session, target, token);
  result := public.saais_invitation_service('revokeAccountInvite', 'start', '{}', staff, staff_session, target);
  perform test.assert(result->>'invitation_status' = 'revoked', 'Staff can revoke a pending invitation within scope');
  perform public.saais_invitation_service('resendAccountInvite', 'start', '{}', staff, staff_session, target, new_token);
  perform public.saais_invitation_service('verifyInviteToken', 'start', jsonb_build_object('token',hash), p_token => hash, p_redemption => lease);
  begin
    perform public.saais_invitation_service('revokeAccountInvite', 'start', '{}', admin, admin_session, target);
    raise exception 'Revoked a leased invitation';
  exception when sqlstate 'PT409' then null;
  end;
  perform public.saais_invitation_service('verifyInviteToken', 'finishRedemption', '{}', p_token => hash, p_redemption => lease);
  perform public.saais_invitation_service('verifyInviteToken', 'finishRedemption', '{}', p_token => hash, p_redemption => lease);
  perform test.assert((select status = 'active' and invitation_status = 'accepted' from public.profile where id = target),
    'Auth completion activates the profile once');
  perform test.assert(exists(select 1 from public.notification where event_type='invitation_accepted' and entity_id=target), 'Activation notifies the administrative recipients');
  perform test.assert(exists(select 1 from public.notification where event_type='adviser_assigned' and target_student_id=target and recipient_id=target), 'Initial student receives adviser notification when activated');
  begin
    perform public.saais_invitation_service('inviteUser', 'prepare', request, staff, staff_session);
    raise exception 'Accepted account was reinvited as an idempotent success';
  exception when sqlstate 'PT409' then null; end;
  perform test.assert((select count(*) = 1 from public.audit_log_entry where entity_id = target and action = 'invitation_accepted'),
    'Redemption retry never duplicates the audit event');
  perform test.assert(not has_function_privilege('authenticated',
    'public.saais_invitation_service(text,text,jsonb,uuid,uuid,uuid,text,uuid)', 'EXECUTE'), 'Browser cannot enter provisioning RPC');
end;
$$;
