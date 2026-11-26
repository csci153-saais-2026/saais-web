do $$
declare
  staff uuid := '00000003-0000-4000-8000-000000000000';
  staff_session uuid := '00000003-0000-4000-8000-000000000001';
  target uuid := gen_random_uuid();
  identity_id uuid := gen_random_uuid();
  token text := repeat('e',64);
  reservation jsonb;
  result jsonb;
  request jsonb := jsonb_build_object('role','student','full_name','Google invite fixture',
    'email','google-fixture@vsu.edu.ph','student_number','26-1-99343',
    'program_id',(select value->>'id' from test.records where name='program'),
    'curriculum_version_id',(select value->>'id' from test.records where name='version'),
    'adviser_id','00000004-0000-4000-8000-000000000000');
begin
  reservation := public.saais_invitation_service('inviteUser','prepare',request,staff,staff_session);
  insert into auth.users(id,email,raw_app_meta_data) values(target,request->>'email',
    jsonb_build_object('saais_provisioning_id',reservation->>'reservation_id'));
  result := public.saais_invitation_service('inviteUser','finish',request,staff,staff_session,null,token);
  insert into auth.identities(id,user_id,provider,identity_data)
    values(identity_id,target,'google','{"email":"google-fixture@vsu.edu.ph","email_verified":false}');
  perform test.assert((select status='invited' from public.profile where id=target), 'Unverified Google email is not accepted');
  update auth.identities set identity_data='{"email":"other@vsu.edu.ph","email_verified":true}' where id=identity_id;
  perform test.assert((select status='invited' from public.profile where id=target), 'Mismatched Google email is not accepted');
  update public.profile set invitation_status='revoked' where id=target;
  update auth.identities set identity_data='{"email":"google-fixture@vsu.edu.ph","email_verified":true}' where id=identity_id;
  perform test.assert((select status='invited' from public.profile where id=target), 'A revoked invitation is not activated');
  update public.profile set invitation_status='pending',invitation_expires_at=clock_timestamp()-interval '1 second' where id=target;
  update auth.identities set identity_data=identity_data where id=identity_id;
  perform test.assert((select status='invited' from public.profile where id=target), 'An expired invitation is not activated');
  update public.profile set invitation_expires_at=clock_timestamp()+interval '1 day',status='disabled' where id=target;
  update auth.identities set identity_data=identity_data where id=identity_id;
  perform test.assert((select status='disabled' from public.profile where id=target), 'A disabled account is not reactivated');
  update public.profile set status='invited' where id=target;
  update auth.identities set identity_data='{"email":"GOOGLE-fixture@vsu.edu.ph","email_verified":true}' where id=identity_id;
  perform test.assert((select status='active' and invitation_status='accepted' from public.profile where id=target), 'Verified Google identity activates invited profile');
  perform test.assert(not exists(select 1 from saais_private.account_invitation where profile_id=target)
    and not exists(select 1 from saais_private.invite_email where profile_id=target), 'Google activation invalidates password token and queued invite');
  update auth.identities set identity_data=identity_data where id=identity_id;
  perform test.assert((select count(*)=1 from public.audit_log_entry where entity_id=target and action='invitation_accepted'), 'Repeated sign-ins do not duplicate acceptance');
end $$;
