-- Retain only a one-way hash of retired tokens so a known terminal invite can
-- return the documented conflict without exposing account details.
create table saais_private.closed_invitation_token(token_hash text primary key, closed_at timestamptz not null default clock_timestamp());
revoke all on saais_private.closed_invitation_token from public, anon, authenticated;
create function saais_private.remember_closed_invitation() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
  insert into saais_private.closed_invitation_token(token_hash) values(old.token_hash) on conflict do nothing;
  return old;
end $$;
revoke all on function saais_private.remember_closed_invitation() from public, anon, authenticated;
create trigger saais_remember_closed_invitation before delete on saais_private.account_invitation
  for each row execute function saais_private.remember_closed_invitation();

create or replace function saais_private.provision_invitee(p_mode text, p_body jsonb, p_token text) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  v_actor uuid := saais_private.actor();
  v_scope record;
  v_request jsonb := p_body || jsonb_build_object('email', lower(btrim(p_body->>'email')));
  v_reservation saais_private.invite_reservation;
  v_auth uuid;
  v_department uuid;
  v_date date := (now() at time zone 'Asia/Manila')::date;
  v_result jsonb;
begin
  perform pg_advisory_xact_lock(531201, 1);
  select r.* into v_reservation from saais_private.invite_reservation r
    where r.email = v_request->>'email' for update;
  if v_reservation.id is not null then
    if (v_reservation.requested_by <> v_actor and not saais_private.has_role('admin')) or p_mode = 'preview' then
      perform saais_private.fail(409, 'An account with that identifier already exists or is being provisioned.');
    end if;
    if v_reservation.profile_id is not null then
      -- Recheck current actor scope before disclosing whether the account already accepted.
      if not saais_private.has_role('admin') then
        v_department := coalesce((saais_private.organization(v_reservation.profile_id)->>'department_id')::uuid,
          (select department_id from public.profile where id = v_reservation.profile_id));
        if v_department is null then
          perform saais_private.fail(403, 'This invitation is outside your authorized scope.');
        end if;
        perform saais_private.require_scope(array['department_head','department_staff'], v_department);
        if exists (select 1 from public.role_assignment a where a.profile_id = v_reservation.profile_id
          and (a.role in ('admin','dean') or (a.role <> 'student' and a.department_id is distinct from v_department))) then
          perform saais_private.fail(403, 'This invitation is outside your authorized scope.');
        end if;
      end if;
      if exists(select 1 from public.profile p where p.id=v_reservation.profile_id and p.invitation_status='accepted') then
        perform saais_private.fail(409, 'This account has already accepted its invitation.');
      end if;
      if v_reservation.request <> v_request then
        perform saais_private.fail(409, 'An account with that identifier already exists or is being provisioned.');
      end if;
      return jsonb_build_object('success', true, 'message', 'Account already provisioned.',
        'profile_id', v_reservation.profile_id);
    end if;
    if v_reservation.request <> v_request then
      -- Correct only the mutable adviser for an unfinished student reservation, retaining
      -- the same reserved identity and revalidating the complete updated request.
      if p_mode <> 'prepare' or v_reservation.request->>'role' <> 'student'
        or (v_reservation.request - 'adviser_id') <> (v_request - 'adviser_id') then
        perform saais_private.fail(409, 'An account with that identifier already exists or is being provisioned.');
      end if;
      select * into v_scope from saais_private.validate_invitee(v_request);
      update saais_private.invite_reservation set request = v_request where id = v_reservation.id;
    end if;
  end if;
  select * into v_scope from saais_private.validate_invitee(v_request);
  if v_reservation.id is null and (
    exists (select 1 from public.profile p
      where lower(btrim(p.email)) = v_request->>'email' or p.student_number = v_request->>'student_number')
    or exists (select 1 from auth.users u where lower(u.email) = v_request->>'email')
    or exists (select 1 from saais_private.invite_reservation r where r.student_number = v_request->>'student_number')
  ) then
    perform saais_private.fail(409, 'An account with that identifier already exists or is being provisioned.');
  end if;
  if p_mode = 'preview' then return '{}'::jsonb; end if;
  if v_reservation.id is null and p_mode = 'prepare' then
    insert into saais_private.invite_reservation (email, student_number, requested_by, request)
    values (v_request->>'email', v_request->>'student_number', v_actor, v_request)
    returning * into v_reservation;
  end if;
  select u.id into v_auth from auth.users u
    where lower(u.email) = v_reservation.email and u.raw_app_meta_data->>'saais_provisioning_id' = v_reservation.id::text;
  if p_mode = 'prepare' then
    return jsonb_build_object('reservation_id', v_reservation.id, 'auth_ready', v_auth is not null);
  end if;
  if v_auth is null then perform saais_private.fail(409, 'The reserved Auth identity is not ready. Retry the operation.'); end if;
  insert into public.profile (id, role, email, full_name, status, student_number, department_id, faculty_id, entry_year)
  values (v_auth, v_scope.primary_role, v_reservation.email, btrim(v_request->>'full_name'), 'invited',
    v_reservation.student_number, case when v_scope.primary_role <> 'student' then v_scope.department end,
    case when v_scope.primary_role in ('adviser','dean') then v_scope.faculty end, (v_request->>'entry_year')::integer);
  insert into public.role_assignment (profile_id, role, department_id, faculty_id)
  select v_auth, g.role, g.department_id, g.faculty_id
  from jsonb_to_recordset(v_scope.grants) as g(role public.role_type, department_id uuid, faculty_id uuid);
  if v_scope.primary_role = 'student' then
    insert into public.student_curriculum_assignment(student_id, curriculum_version_id, start_date, reason)
    values (v_auth, (v_request->>'curriculum_version_id')::uuid, v_date, 'Initial provisioning');
    insert into public.adviser_assignment(student_id, adviser_id, start_date, reason)
    values (v_auth, (v_request->>'adviser_id')::uuid, v_date, 'Initial provisioning');
  end if;
  update saais_private.invite_reservation set profile_id = v_auth where id = v_reservation.id;
  v_result := saais_private.queue_invitation(v_auth, p_token);
  perform saais_private.audit('inviteUser', 'profile', v_auth, null, jsonb_build_object('role', v_scope.primary_role),
    case when v_scope.primary_role = 'student' then v_auth end);
  return v_result;
end;
$$;


create or replace function saais_private.redeem_invitation(p_stage text, p_hash text, p_redemption uuid, p_reason text)
returns jsonb language plpgsql set search_path = pg_catalog as $$
declare
  v_profile public.profile;
  v_invite saais_private.account_invitation;
  v_org jsonb;
  v_state text;
  v_next text;
begin
  -- Serialize with resend/revoke while the password update lease is issued.
  perform pg_advisory_xact_lock(531201, 1);
  select i.* into v_invite from saais_private.account_invitation i where i.token_hash = p_hash for update;
  if not found then
    if p_stage = 'declineInviteToken' and exists(select 1 from saais_private.closed_invitation_token t where t.token_hash = p_hash) then
      perform saais_private.fail(409, 'This invitation is no longer pending.');
    end if;
    perform saais_private.fail(404, 'Invitation not found.');
  end if;
  select * into v_profile from public.profile where id = v_invite.profile_id for update;
  v_state := case when v_profile.invitation_status = 'pending' and v_profile.invitation_expires_at <= clock_timestamp()
                   then 'expired' else v_profile.invitation_status end;
  if v_profile.invitation_status = 'accepted' and p_stage <> 'finishRedemption' then
    if p_stage = 'declineInviteToken' then perform saais_private.fail(409, 'This invitation is no longer pending.'); end if;
    perform saais_private.fail(404, 'Invitation not found.');
  end if;
  if p_stage = 'previewInviteToken' then
    v_org := saais_private.organization(v_profile.id);
    return jsonb_build_object('valid', v_state = 'pending' and v_profile.status = 'invited',
      'status', v_state, 'email', v_profile.email, 'full_name', v_profile.full_name, 'role', v_profile.role,
      'roles', (select jsonb_agg(distinct role) from public.role_assignment where profile_id = v_profile.id),
      'faculty_name', (select name from public.faculty
        where id = coalesce((v_org->>'faculty_id')::uuid, v_profile.faculty_id,
          (select faculty_id from public.department where id = v_profile.department_id))),
      'department_name', (select name from public.department
        where id = coalesce((v_org->>'department_id')::uuid, v_profile.department_id)),
      'program_code', (select code from public.program where id = (v_org->>'program_id')::uuid),
      'expires_at', v_profile.invitation_expires_at);
  end if;
  if p_stage = 'cancelRedemption' then
    update saais_private.account_invitation set redemption_id = null, redemption_until = null
      where profile_id = v_profile.id and redemption_id = p_redemption;
    return '{}'::jsonb;
  end if;
  if p_stage = 'finishRedemption' then
    if v_profile.invitation_status = 'accepted' and v_invite.redemption_id = p_redemption then
      return '{"success":true,"message":"Account successfully activated."}'::jsonb;
    end if;
    if v_invite.redemption_id is distinct from p_redemption or v_invite.redemption_until <= clock_timestamp()
      or v_profile.status <> 'invited' then
      perform saais_private.fail(409, 'Invitation redemption is no longer current.');
    end if;
    v_next := 'accepted';
  else
    if v_state <> 'pending' or v_profile.status <> 'invited' then
      perform saais_private.fail(409, 'This invitation is no longer pending.');
    end if;
    if v_invite.redemption_until > clock_timestamp() then
      perform saais_private.fail(409, 'The invitation is being redeemed. Retry shortly.');
    end if;
    if p_stage = 'verifyInviteToken' then
      update saais_private.account_invitation set
        redemption_id = p_redemption, redemption_until = clock_timestamp() + interval '2 minutes'
        where profile_id = v_profile.id;
      return jsonb_build_object('profile_id', v_profile.id);
    end if;
    v_next := 'declined';
  end if;
  update public.profile set invitation_status = v_next, updated_at = clock_timestamp(),
    status = case when v_next = 'accepted' then 'active'::public.profile_status else status end
    where id = v_profile.id;
  delete from saais_private.invite_email where profile_id = v_profile.id;
  if v_next = 'accepted' then
    update saais_private.account_invitation set redemption_until = null where profile_id = v_profile.id;
  else
    delete from saais_private.account_invitation where profile_id = v_profile.id;
  end if;
  insert into public.audit_log_entry(actor_id, actor_name, actor_role, action, action_category, entity_type, entity_id, reason)
  values (case when v_next = 'accepted' then v_profile.id end, v_profile.full_name, v_profile.role,
    'invitation_' || v_next, 'auth_account', 'profile', v_profile.id, p_reason);
  if v_next = 'accepted' then
    return '{"success":true,"message":"Account successfully activated."}'::jsonb;
  end if;
  return '{"success":true,"message":"Invitation declined.","invitation_status":"declined"}'::jsonb;
end;
$$;

create or replace function public.saais_invitation_service(
  p_operation text, p_stage text, p_body jsonb, p_actor uuid default null,
  p_session uuid default null, p_profile uuid default null, p_token text default null,
  p_redemption uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog
set statement_timeout = '20s' as $$
declare
  is_public boolean := p_operation in ('previewInviteToken','verifyInviteToken','declineInviteToken');
  request jsonb := p_body;
  actor_id uuid;
  budget integer;
  admitted_at timestamptz := statement_timestamp();
begin
  if is_public then
    if p_stage = 'admit' then
      -- Only issued tokens receive a bucket; arbitrary hashes cannot grow the table.
      if p_token is null or p_token !~ '^[0-9a-f]{64}$'
        or not exists (select 1 from saais_private.account_invitation i where i.token_hash = p_token) then
        if p_operation='declineInviteToken' and exists(select 1 from saais_private.closed_invitation_token t where t.token_hash=p_token) then
          perform saais_private.fail(409, 'This invitation is no longer pending.');
        end if;
        perform saais_private.fail(404, 'Invitation not found.');
      end if;
      insert into saais_private.public_invitation_budget as b (operation, token_hash, window_start, count)
        values (p_operation, p_token, admitted_at, 1)
        on conflict (operation, token_hash) do update set
          window_start = case when b.window_start <= admitted_at - interval '1 minute'
            then admitted_at else b.window_start end,
          count = case when b.window_start <= admitted_at - interval '1 minute'
            then 1 else b.count + 1 end
        where b.count < 60 or b.window_start <= admitted_at - interval '1 minute';
      if not found then
        perform saais_private.fail(429, 'Request budget exceeded. Retry after 60 seconds.');
      end if;
      return '{}'::jsonb;
    end if;
    if p_stage = 'start' then
      -- The password is checked by Edge before the lease is issued. Pass a
      -- length-valid placeholder to validate the contract without logging it.
      if p_operation = 'verifyInviteToken' then
        request := p_body || jsonb_build_object('password','Placeholder1');
      end if;
      perform saais_private.invitation_schema(p_operation, request);
    elsif p_operation <> 'verifyInviteToken' or p_stage is null
      or p_stage not in ('finishRedemption','cancelRedemption') then
      perform saais_private.fail(400, 'Unsupported invitation stage.');
    end if;
    if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
      perform saais_private.fail(404, 'Invitation not found.');
    end if;
    return saais_private.redeem_invitation(case when p_stage = 'start' then p_operation else p_stage end,
      p_token, p_redemption, p_body->>'reason');
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_actor, 'session_id', p_session)::text, true);
  actor_id := saais_private.actor();
  perform saais_private.require_scope(array['department_head','department_staff','admin']);

  -- Only the service role can invoke this RPC. The common Edge handler admits
  -- each request before forwarding its work, including one admission per batch.
  if p_stage = 'admit' and p_operation in (
    'inviteUser','resendAccountInvite','revokeAccountInvite','importStudentsBatch'
  ) then
    insert into saais_private.request_budget as b (actor_id, window_start, count)
      values (actor_id, date_trunc('minute', now()), 1)
      on conflict on constraint request_budget_pkey do update set count = b.count + 1
      returning count into budget;
    if budget > 120 then perform saais_private.fail(429, 'Request budget exceeded. Retry after 60 seconds.'); end if;
    return '{}'::jsonb;
  end if;
  if not coalesce(
    (p_operation = 'inviteUser' and p_stage in ('prepare','finish'))
    or (p_operation in ('resendAccountInvite','revokeAccountInvite') and p_stage = 'start')
    or (p_operation = 'importStudentsBatch' and p_stage in ('validate','preview','prepare','finish')), false
  ) then
    perform saais_private.fail(400, 'Unsupported invitation operation or stage.');
  end if;
  if p_operation = 'importStudentsBatch' and p_stage = 'validate' then
    perform saais_private.invitation_schema(p_operation, p_body);
    return '{}'::jsonb;
  elsif p_operation = 'importStudentsBatch' then
    request := (p_body - 'row_number') || '{"role":"student"}'::jsonb;
  elsif p_operation in ('resendAccountInvite','revokeAccountInvite') then
    perform saais_private.invitation_schema(p_operation, p_body);
    return saais_private.manage_invitation(p_operation, p_profile, p_body, p_token);
  end if;
  perform saais_private.invitation_schema('inviteUser', request);
  return saais_private.provision_invitee(p_stage, request, p_token);
exception
  when unique_violation or foreign_key_violation then
    perform saais_private.fail(409, 'An identity conflicts with an existing account or assignment.');
  when check_violation or not_null_violation or invalid_text_representation then
    perform saais_private.fail(400, 'The invitation violates a data constraint.');
end;
$$;
