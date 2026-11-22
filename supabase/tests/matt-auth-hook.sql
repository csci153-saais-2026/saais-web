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
end;
$$;
