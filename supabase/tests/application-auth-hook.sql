do $$
declare
  staff uuid := '00000003-0000-4000-8000-000000000000';
  staff_session uuid := '00000003-0000-4000-8000-000000000001';
  req jsonb := jsonb_build_object('role','student','full_name','Hook fixture',
    'email','hook-fixture@vsu.edu.ph','student_number','26-1-99398',
    'program_id',(select value->>'id' from test.records where name='program'),
    'curriculum_version_id',(select value->>'id' from test.records where name='version'),
    'adviser_id','00000004-0000-4000-8000-000000000000');
  reservation jsonb;
  event jsonb;
  result jsonb;
  version uuid := (select (value->>'id')::uuid from test.records where name='version');
begin
  perform test.assert(not has_function_privilege('anon','public.saais_before_user_created(jsonb)','execute')
    and not has_function_privilege('authenticated','public.saais_before_user_created(jsonb)','execute')
    and not has_function_privilege('service_role','public.saais_before_user_created(jsonb)','execute')
    and has_function_privilege('supabase_auth_admin','public.saais_before_user_created(jsonb)','execute'),
    'Only the Supabase Auth hook role can execute the signup gate');
  reservation := public.saais_invitation_service('inviteUser','prepare',req,staff,staff_session);
  event := jsonb_build_object('user',jsonb_build_object('email','Hook-Fixture@vsu.edu.ph',
    'app_metadata',jsonb_build_object('saais_provisioning_id',reservation->>'reservation_id')));
  perform test.assert(public.saais_before_user_created(event) = '{}'::jsonb, 'Matching reservation may provision an Auth user');
  perform test.assert(public.saais_before_user_created(jsonb_set(event,'{user,email}','"other@vsu.edu.ph"')) ? 'error',
    'Reservation cannot be reused for a different email');
  perform test.assert(public.saais_before_user_created(jsonb_set(event,'{user,email}','"hook-fixture@elsewhere.test"')) ? 'error',
    'Non-institutional emails are rejected');
  perform test.assert(public.saais_before_user_created('{"user":{"email":"unlisted@vsu.edu.ph"}}') ? 'error',
    'Unlisted institutional users cannot sign up');
  perform test.assert(public.saais_before_user_created(jsonb_build_object('user',jsonb_build_object(
    'email','hook-fixture@vsu.edu.ph','user_metadata',jsonb_build_object('saais_provisioning_id',reservation->>'reservation_id')))) ? 'error',
    'User-editable metadata cannot impersonate a provisioning reservation');
  perform test.assert(public.saais_before_user_created('{}') ? 'error','Malformed event fails closed');
  perform test.login(1);
  result := test.call('updateCurriculumVersion', jsonb_build_object('id',version), '{"status":"retired"}');
  perform test.assert(result->>'status' = 'retired', 'The API accepts the approved retired curriculum status');

  -- Durable rejected-login audit RPCs (#189)
  perform test.assert(
    not has_function_privilege('anon','public.saais_record_rejected_login(text,text,uuid,text)','execute')
    and not has_function_privilege('authenticated','public.saais_record_rejected_login(text,text,uuid,text)','execute')
    and has_function_privilege('service_role','public.saais_record_rejected_login(text,text,uuid,text)','execute')
    and not has_function_privilege('authenticated','public.saais_evaluate_before_user_created(jsonb,text)','execute')
    and has_function_privilege('service_role','public.saais_evaluate_before_user_created(jsonb,text)','execute')
    and not has_function_privilege('authenticated','public.saais_evaluate_access_token(jsonb,text)','execute')
    and has_function_privilege('service_role','public.saais_evaluate_access_token(jsonb,text)','execute'),
    'Rejected-login audit RPCs are restricted to the service role');

  result := public.saais_evaluate_before_user_created(event);
  perform test.assert(result->>'allowed' = 'true', 'Valid reservation passes HTTP hook evaluation');
  perform test.assert(not exists(select 1 from public.audit_log_entry where action = 'login_rejected'),
    'Allowed signup does not write a rejected-login audit entry');

  result := public.saais_evaluate_before_user_created('{"user":{"email":"outsider@gmail.com"}}');
  perform test.assert(result->>'allowed' = 'false' and result->>'rejection_reason' = 'non_institutional_domain',
    'Non-institutional attempt is rejected with category');
  perform test.assert(exists(select 1 from public.audit_log_entry
    where action = 'login_rejected' and action_category = 'auth_account'
      and actor_id is null and entity_type = 'auth_attempt'
      and new_value->>'rejection_reason' = 'non_institutional_domain'
      and new_value->>'email_domain' = 'gmail.com'
      and coalesce(new_value::text, '') not like '%outsider%'),
    'Non-institutional rejection logs domain-only metadata without exposing the email local-part');

  result := public.saais_evaluate_before_user_created('{"user":{"email":"unlisted-person@vsu.edu.ph"}}');
  perform test.assert(result->>'allowed' = 'false' and result->>'rejection_reason' = 'unprovisioned_account',
    'Unprovisioned institutional attempt is rejected and audited');
  perform test.assert(exists(select 1 from public.audit_log_entry
    where action = 'login_rejected' and new_value->>'rejection_reason' = 'unprovisioned_account'
      and coalesce(new_value::text, '') not like '%unlisted-person%'),
    'Unprovisioned rejection avoids storing sensitive identity data');

  result := public.saais_evaluate_access_token('{"user_id":"00000010-0000-4000-8000-000000000000","claims":{"email":"person10@example.test"}}');
  perform test.assert(result->>'allowed' = 'false' and result->>'rejection_reason' = 'disabled_account',
    'Disabled account access-token attempt is rejected and audited');
  perform test.assert(exists(select 1 from public.audit_log_entry
    where action = 'login_rejected' and entity_type = 'profile'
      and entity_id = '00000010-0000-4000-8000-000000000000'
      and new_value->>'rejection_reason' = 'disabled_account'),
    'Disabled account rejection links only the disabled profile id');

  declare
    signup jsonb := '{"user":{"email":"replay@example.net"}}';
    token_event jsonb := '{"user_id":"00000010-0000-4000-8000-000000000000","claims":{"email":"person10@example.test"}}';
    before_count bigint := (select count(*) from public.audit_log_entry where action='login_rejected');
  begin
    result := public.saais_evaluate_before_user_created(signup, 'msg_replayed_signup');
    perform test.assert(result->>'allowed'='false', 'The original signup delivery is denied');
    result := public.saais_evaluate_before_user_created(signup, 'msg_replayed_signup');
    perform test.assert(result->>'allowed'='false', 'Replayed signup delivery still receives a denial');

    result := public.saais_evaluate_access_token(token_event, 'msg_replayed_token');
    perform test.assert(result->>'allowed'='false', 'The original token delivery is denied');
    result := public.saais_evaluate_access_token(token_event, 'msg_replayed_token');
    perform test.assert(result->>'allowed'='false', 'Replayed token delivery still receives a denial');
    perform test.assert((select count(*)=before_count+2 from public.audit_log_entry where action='login_rejected'),
      'Each signed delivery writes one rejection audit row');

    perform public.saais_evaluate_before_user_created(signup, 'msg_new_signup');
    perform test.assert((select count(*)=before_count+3 from public.audit_log_entry where action='login_rejected'),
      'A fresh delivery with the same event is audited independently');

    -- Verify deduplication retention prunes expired hashes while keeping
    -- recent hashes and leaving audit_log_entry untouched.
    update saais_private.rejected_login_webhook
      set recorded_at = clock_timestamp() - interval '8 days'
      where id_hash = sha256(convert_to('msg_replayed_signup', 'UTF8'));
    perform public.saais_evaluate_before_user_created(signup, 'msg_after_retention');
    perform test.assert(not exists(
      select 1 from saais_private.rejected_login_webhook
      where id_hash = sha256(convert_to('msg_replayed_signup', 'UTF8'))
    ), 'Expired deduplication hashes are pruned beyond the retention window');
    perform test.assert(exists(
      select 1 from saais_private.rejected_login_webhook
      where id_hash = sha256(convert_to('msg_new_signup', 'UTF8'))
    ), 'Recent deduplication hashes within the retention window are preserved');
    perform test.assert((select count(*)=before_count+4 from public.audit_log_entry where action='login_rejected'),
      'Pruning expired deduplication records preserves rejected-login audit entries');
  end;

  result := public.saais_evaluate_access_token('{"user_id":"00000005-0000-4000-8000-000000000000","claims":{"email":"person5@example.test"}}');
  perform test.assert(result->>'allowed' = 'true', 'Active provisioned profile passes access-token hook');

  declare
    target uuid := '00000005-0000-4000-8000-000000000000';
    token_event jsonb := jsonb_build_object('user_id', target, 'authentication_method', 'password',
      'claims', jsonb_build_object('session_id', '00000005-0000-4000-8000-000000000099'));
    refresh_event jsonb := jsonb_set(token_event, '{authentication_method}', '"token_refresh"');
    before_sign_ins bigint := (select count(*) from public.audit_log_entry where action = 'sign_in_succeeded');
  begin
    update public.profile set status = 'invited' where id = target;
    result := public.saais_evaluate_access_token(token_event, 'msg_invited');
    perform test.assert(result->>'allowed' = 'false' and result->>'http_code' = '403',
      'Invited accounts cannot receive tokens');
    perform test.assert(exists(select 1 from public.audit_log_entry
      where action = 'login_rejected' and entity_id = target
        and new_value->>'rejection_reason' = 'unprovisioned_account'), 'Invited denial is audited');

    result := public.saais_evaluate_access_token(jsonb_set(token_event, '{user_id}',
      '"12345678-0000-4000-8000-000000000000"'));
    perform test.assert(result->>'allowed' = 'false' and result->>'rejection_reason' = 'unprovisioned_account',
      'Missing profiles cannot receive tokens');

    update public.profile set status = 'active' where id = target;
    result := public.saais_evaluate_access_token(refresh_event, 'msg_refresh_first');
    perform test.assert(result->>'allowed' = 'true' and
      (select count(*) = before_sign_ins from public.audit_log_entry where action = 'sign_in_succeeded'),
      'A refresh on a session with no audit record does not log a sign-in');
    result := public.saais_evaluate_access_token(token_event, 'msg_first_sign_in');
    perform test.assert(result->>'allowed' = 'true', 'The account can sign in after activation');
    perform public.saais_evaluate_access_token(token_event, 'msg_sign_in_redelivered');
    perform public.saais_evaluate_access_token(refresh_event, 'msg_refresh_after_sign_in');
    perform test.assert((select count(*) = before_sign_ins + 1 from public.audit_log_entry
      where action = 'sign_in_succeeded' and action_category = 'sign_in'
        and actor_id = target and student_id = target), 'Only one audit event for the same session');

    token_event := jsonb_set(jsonb_set(token_event, '{authentication_method}', '"oauth"'),
      '{claims,session_id}', '"00000005-0000-4000-8000-000000000100"');
    result := public.saais_evaluate_access_token(token_event, 'msg_google_sign_in');
    perform test.assert(result->>'allowed' = 'true' and
      (select count(*) = before_sign_ins + 2 from public.audit_log_entry
       where action = 'sign_in_succeeded' and action_category = 'sign_in'),
      'A separate OAuth sign-in writes its own event');
  end;
end;
$$;
