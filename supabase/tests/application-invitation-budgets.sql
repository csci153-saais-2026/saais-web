do $$
declare
  actor uuid := '00000001-0000-4000-8000-000000000000';
  session uuid := '00000001-0000-4000-8000-000000000001';
  minute_start timestamptz := date_trunc('minute', now());
  operation text;
  invite_request jsonb := '{"email":"budget-fixture@vsu.edu.ph","role":"admin","full_name":"Budget fixture"}';
begin
  perform test.assert(not has_function_privilege('anon',
    'public.saais_invitation_service(text,text,jsonb,uuid,uuid,uuid,text,uuid)', 'EXECUTE'),
    'Anon clients cannot bypass the Edge admission gate');
  perform test.assert(not has_function_privilege('authenticated',
    'public.saais_invitation_service(text,text,jsonb,uuid,uuid,uuid,text,uuid)', 'EXECUTE'),
    'Authenticated clients cannot bypass the Edge admission gate');

  insert into saais_private.request_budget values (actor, minute_start, 119)
    on conflict on constraint request_budget_pkey do update set count = 119;
  perform test.login(1);
  perform public.matt_operation('getHealthStatus');
  perform test.assert((select count = 120 from saais_private.request_budget
    where actor_id = actor and window_start = minute_start), 'Matt uses the last shared request slot');

  foreach operation in array array[
    'inviteUser','resendAccountInvite','revokeAccountInvite','importStudentsBatch'
  ] loop
    begin
      perform public.saais_invitation_service(operation, 'admit', '{}', actor, session);
      raise exception 'Exhausted invitation request reached operation %', operation;
    exception when sqlstate 'PT429' then null;
    end;
  end loop;
  perform test.assert(not exists(select 1 from saais_private.invite_reservation
    where email = invite_request->>'email'), 'The rejected invite did not reserve the account');

  update saais_private.request_budget set count = 119 where actor_id = actor and window_start = minute_start;
  perform public.saais_invitation_service('inviteUser', 'admit', '{}', actor, session);
  begin
    perform public.saais_invitation_service('inviteUser', 'prepare', '{}', actor, session);
    raise exception 'Invalid invitation should fail';
  exception when sqlstate 'PT400' then null;
  end;
  perform test.assert((select count = 120 from saais_private.request_budget
    where actor_id = actor and window_start = minute_start), 'Failed invitation operations still spend the admission');
  perform public.saais_invitation_service('inviteUser', 'prepare', invite_request, actor, session);
  perform test.assert(exists(select 1 from saais_private.invite_reservation
    where email = invite_request->>'email'), 'An invitation within the budget can reserve the account');
  begin
    perform test.call('createCourse','{}',
      jsonb_build_object('code','LIM101','title','Budget fixture','units',3,
        'department_id',(select value->>'id' from test.records where name='department')));
    raise exception 'Jerome did not observe the last shared request slot';
  exception when sqlstate 'PT429' then null;
  end;
end
$$;
