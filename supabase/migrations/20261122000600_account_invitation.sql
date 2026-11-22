create table saais_private.invite_reservation (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  student_number text unique,
  requested_by uuid not null references public.profile(id),
  request jsonb not null,
  profile_id uuid unique references public.profile(id)
);

create table saais_private.account_invitation (
  profile_id uuid primary key references public.profile(id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  redemption_id uuid,
  redemption_until timestamptz
);

create table saais_private.invite_email (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profile(id),
  token text not null check (token ~ '^[0-9a-f]{64}$'),
  available_at timestamptz not null default now(),
  attempts integer not null default 0
);

revoke all on saais_private.invite_reservation, saais_private.account_invitation, saais_private.invite_email
  from public, anon, authenticated;

create function saais_private.invitation_schema(p_operation text, p_body jsonb) returns void
language plpgsql stable set search_path = pg_catalog as $$
declare
  op jsonb;
begin
  select entry into op
  from saais_private.matt_contract c cross join lateral jsonb_array_elements(c.document->'operations') entry
  where entry->>'id' = p_operation;
  if op is null or not (op->>'bodyRequired' = 'false' and p_body = '{}'::jsonb)
    and not coalesce(saais_private.valid(p_body, op->'input'), false) then
    perform saais_private.fail(400, 'Request does not match the invitation contract.');
  end if;
end;
$$;

create function saais_private.validate_invitee(p_body jsonb)
returns table (primary_role public.role_type, department uuid, faculty uuid, grants jsonb)
language plpgsql set search_path = pg_catalog as $$
declare
  v_adviser uuid := (p_body->>'adviser_id')::uuid;
  v_number text := p_body->>'student_number';
  v_email text := lower(btrim(p_body->>'email'));
  assignment jsonb;
  assigned_role public.role_type;
  assigned_department uuid;
  assigned_faculty uuid;
  department_faculty uuid;
  primary_grant jsonb;
begin
  primary_role := (p_body->>'role')::public.role_type;
  department := (p_body->>'department_id')::uuid;
  faculty := (p_body->>'faculty_id')::uuid;
  perform saais_private.actor();
  perform saais_private.require_scope(array['department_head','department_staff','admin']);
  if v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@vsu[.]edu[.]ph$' or nullif(btrim(p_body->>'full_name'), '') is null then
    perform saais_private.fail(400, 'A name and institutional email are required.');
  end if;
  if v_email = (select lower(btrim(p.email)) from public.profile p where p.id = auth.uid()) then
    perform saais_private.fail(403, 'You cannot grant roles to yourself.');
  end if;
  if primary_role = 'student' then
    if v_number is null or v_number !~ '^[0-9]{2}-[0-9]-[0-9]{5}$' then
      perform saais_private.fail(400, 'Student number must use YY-N-NNNNN format.');
    end if;
    select p.department_id, d.faculty_id into department, faculty
    from public.curriculum_version v join public.program p on p.id = v.program_id
    join public.department d on d.id = p.department_id
    where v.id = (p_body->>'curriculum_version_id')::uuid and p.id = (p_body->>'program_id')::uuid
      and v.status = 'active' and p.status = 'active';
    if not found then perform saais_private.fail(409, 'Choose an active curriculum in the selected program.'); end if;
    perform saais_private.require_scope(array['department_head','department_staff','admin'], department);
    if not exists (
      select 1 from public.profile p join public.role_assignment a on a.profile_id = p.id
      where p.id = v_adviser and p.status = 'active' and a.role = 'adviser' and a.faculty_id = faculty
        and (a.department_id = department or (a.department_id is null and p.department_id = department))
    ) then
      perform saais_private.fail(409, 'Choose an eligible active adviser in the student’s department.');
    end if;
  end if;
  primary_grant := jsonb_build_object('role', primary_role, 'department_id',
    case when primary_role in ('adviser','department_staff','department_head') then department end,
    'faculty_id', case when primary_role in ('adviser','dean','department_staff','department_head') then faculty end);
  grants := '[]'::jsonb;
  for assignment in select value from jsonb_array_elements(jsonb_build_array(primary_grant) || coalesce(p_body->'role_assignments','[]')) loop
    assigned_role := (assignment->>'role')::public.role_type;
    assigned_department := (assignment->>'department_id')::uuid;
    assigned_faculty := (assignment->>'faculty_id')::uuid;
    if assigned_role in ('admin','dean') and not saais_private.has_role('admin') then
      perform saais_private.fail(403, 'Your assigned roles cannot grant the requested role or scope.');
    end if;
    if assigned_role = 'admin' then
      assigned_department := null;
      assigned_faculty := null;
    end if;
    if assigned_department is not null then
      select d.faculty_id into department_faculty from public.department d where d.id = assigned_department;
      if not found or (assigned_faculty is not null and assigned_faculty <> department_faculty) then
        perform saais_private.fail(400, 'Department and faculty must match.');
      end if;
      assigned_faculty := department_faculty;
    end if;
    if assigned_role = 'dean' then assigned_department := null; end if;
    if (assigned_role in ('department_head','department_staff') and assigned_department is null)
      or (assigned_role in ('dean','adviser') and assigned_faculty is null)
      or (assigned_role in ('student','admin') and (assigned_department is not null or assigned_faculty is not null))
      or (assigned_role = 'student' and primary_role <> 'student') then
      perform saais_private.fail(400, 'The requested role is missing its required scope or provisioning details.');
    end if;
    if not saais_private.has_role('admin') then
      if assigned_role <> 'student' and assigned_department is null then
        perform saais_private.fail(403, 'Your assigned roles cannot grant the requested role or scope.');
      end if;
      perform saais_private.require_scope(array['department_head','department_staff'], coalesce(assigned_department, department));
    end if;
    assignment := jsonb_build_object('role', assigned_role, 'department_id', assigned_department, 'faculty_id', assigned_faculty);
    if not grants @> jsonb_build_array(assignment) then grants := grants || jsonb_build_array(assignment); end if;
  end loop;
  if jsonb_array_length(grants) > 6 then
    perform saais_private.fail(400, 'At most six role assignments can be provisioned.');
  end if;
  return next;
end;
$$;

create function saais_private.queue_invitation(p_profile uuid, p_token text) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  issued timestamptz := clock_timestamp();
  deadline timestamptz := issued + interval '7 days';
begin
  delete from saais_private.invite_email where profile_id = p_profile;
  insert into saais_private.account_invitation(profile_id, token_hash)
  values (p_profile, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'))
  on conflict (profile_id) do update set token_hash = excluded.token_hash,
    redemption_id = null, redemption_until = null;
  update public.profile set invitation_status = 'pending', invitation_sent_at = issued,
    invitation_expires_at = deadline, updated_at = issued where id = p_profile;
  insert into saais_private.invite_email(profile_id, token) values (p_profile, p_token);
  return jsonb_build_object('success', true, 'message', 'Invitation email queued.', 'profile_id', p_profile,
    'invitation_status', 'pending', 'invitation_sent_at', issued, 'invitation_expires_at', deadline);
end;
$$;

create function saais_private.provision_invitee(p_mode text, p_body jsonb, p_token text) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  v_actor uuid := saais_private.actor();
  v_scope record;
  v_request jsonb := p_body || jsonb_build_object('email', lower(btrim(p_body->>'email')));
  v_reservation saais_private.invite_reservation;
  v_auth uuid;
  v_date date := (now() at time zone 'Asia/Manila')::date;
  v_result jsonb;
begin
  perform pg_advisory_xact_lock(531201, 1);
  select * into v_scope from saais_private.validate_invitee(v_request);
  select r.* into v_reservation from saais_private.invite_reservation r
    where r.email = v_request->>'email' for update;
  if v_reservation.id is not null then
    if v_reservation.requested_by <> v_actor or v_reservation.request <> v_request or p_mode = 'preview' then
      perform saais_private.fail(409, 'An account with that identifier already exists or is being provisioned.');
    end if;
    if v_reservation.profile_id is not null then
      return jsonb_build_object('success', true, 'message', 'Account already provisioned.',
        'profile_id', v_reservation.profile_id);
    end if;
  elsif exists (select 1 from public.profile p
    where lower(btrim(p.email)) = v_request->>'email' or p.student_number = v_request->>'student_number')
    or exists (select 1 from auth.users u where lower(u.email) = v_request->>'email')
    or exists (select 1 from saais_private.invite_reservation r where r.student_number = v_request->>'student_number') then
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


create function saais_private.manage_invitation(p_operation text, p_profile uuid, p_body jsonb, p_token text)
returns jsonb language plpgsql set search_path = pg_catalog as $$
declare
  v_profile public.profile;
  v_invite saais_private.account_invitation;
  v_department uuid;
  v_result jsonb;
begin
  perform saais_private.actor();
  perform saais_private.require_scope(array['department_head','department_staff','admin']);
  perform pg_advisory_xact_lock(531201, 1);
  select * into v_profile from public.profile where id = p_profile for update;
  if not found then perform saais_private.fail(404, 'Account not found.'); end if;
  v_department := coalesce((saais_private.organization(p_profile)->>'department_id')::uuid, v_profile.department_id);
  if auth.uid() = p_profile or (not saais_private.has_role('admin') and (
    v_department is null or exists (
      select 1 from public.role_assignment a where a.profile_id = p_profile
        and (a.role in ('admin','dean') or (a.department_id is not null and a.department_id <> v_department))
    )
  )) then
    perform saais_private.fail(403, 'This invitation is outside your authorized scope.');
  end if;
  perform saais_private.require_scope(array['department_head','department_staff','admin'], v_department);
  select * into v_invite from saais_private.account_invitation where profile_id = p_profile for update;
  if v_profile.status <> 'invited' or v_profile.invitation_status is null
    or v_profile.invitation_status = 'accepted'
    or (p_operation = 'revokeAccountInvite' and (
      v_profile.invitation_status <> 'pending' or v_profile.invitation_expires_at <= clock_timestamp()
    )) then
    perform saais_private.fail(409, 'This invitation cannot be changed in its current state.');
  end if;
  if v_invite.redemption_until > clock_timestamp() then
    perform saais_private.fail(409, 'The invitation is being redeemed. Retry shortly.');
  end if;
  if p_operation = 'resendAccountInvite' then
    v_result := saais_private.queue_invitation(p_profile, p_token);
  else
    delete from saais_private.invite_email where profile_id = p_profile;
    delete from saais_private.account_invitation where profile_id = p_profile;
    update public.profile set invitation_status = 'revoked', updated_at = clock_timestamp() where id = p_profile;
    v_result := saais_private.matt_profile(p_profile);
  end if;
  perform saais_private.audit(p_operation, 'profile', p_profile,
    jsonb_build_object('invitation_status', v_profile.invitation_status),
    jsonb_build_object('invitation_status', v_result->>'invitation_status'),
    case when v_profile.role = 'student' then p_profile end, p_body->>'reason');
  return v_result;
end;
$$;

create function saais_private.redeem_invitation(p_stage text, p_hash text, p_redemption uuid, p_reason text)
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
  if not found then perform saais_private.fail(404, 'Invitation not found.'); end if;
  select * into v_profile from public.profile where id = v_invite.profile_id for update;
  v_state := case when v_profile.invitation_status = 'pending' and v_profile.invitation_expires_at <= clock_timestamp()
                   then 'expired' else v_profile.invitation_status end;
  if v_profile.invitation_status = 'accepted' and p_stage <> 'finishRedemption' then
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

create function public.saais_invitation_service(
  p_operation text, p_stage text, p_body jsonb, p_actor uuid default null,
  p_session uuid default null, p_profile uuid default null, p_token text default null,
  p_redemption uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog
set statement_timeout = '20s' as $$
declare
  is_public boolean := p_operation in ('previewInviteToken','verifyInviteToken','declineInviteToken');
  request jsonb := p_body;
begin
  if is_public then
    if p_stage = 'start' then
      -- The password is checked by Edge before the lease is issued. Pass a
      -- length-valid placeholder to validate the contract without logging it.
      if p_operation = 'verifyInviteToken' then
        request := p_body || jsonb_build_object('password','Placeholder1');
      end if;
      perform saais_private.invitation_schema(p_operation, request);
    end if;
    if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
      perform saais_private.fail(404, 'Invitation not found.');
    end if;
    return saais_private.redeem_invitation(case when p_stage = 'start' then p_operation else p_stage end,
      p_token, p_redemption, p_body->>'reason');
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_actor, 'session_id', p_session)::text, true);
  perform saais_private.actor();
  perform saais_private.require_scope(array['department_head','department_staff','admin']);
  if p_operation = 'importStudentsBatch' and p_stage = 'validate' then
    perform saais_private.invitation_schema(p_operation, p_body);
    return '{}'::jsonb;
  elsif p_operation = 'importStudentsBatch' then
    request := (p_body - 'row_number') || '{"role":"student"}'::jsonb;
  elsif p_operation in ('resendAccountInvite','revokeAccountInvite') then
    perform saais_private.invitation_schema(p_operation, p_body);
    return saais_private.manage_invitation(p_operation, p_profile, p_body, p_token);
  elsif p_operation <> 'inviteUser' then
    perform saais_private.fail(400, 'Unsupported invitation operation.');
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

revoke all on function public.saais_invitation_service(text,text,jsonb,uuid,uuid,uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function public.saais_invitation_service(text,text,jsonb,uuid,uuid,uuid,text,uuid) to service_role;

create function saais_private.current_invitation_status(p_status text, p_expires_at timestamptz)
returns text language sql stable set search_path = pg_catalog as $$
  select case when p_status = 'pending' and p_expires_at <= now() then 'expired' else p_status end;
$$;
revoke all on function saais_private.current_invitation_status(text,timestamptz)
  from public, anon, authenticated;
grant execute on function saais_private.current_invitation_status(text,timestamptz) to authenticated;

create or replace function saais_private.matt_profile(p_id uuid) returns jsonb
language sql stable set search_path = pg_catalog as $$
  select saais_private.project(to_jsonb(p) || jsonb_build_object(
    'roles', coalesce((select jsonb_agg(distinct a.role order by a.role)
      from public.role_assignment a where a.profile_id = p.id), '[]'),
    'invitation_status', saais_private.current_invitation_status(p.invitation_status, p.invitation_expires_at)
  ), '{"$ref":"#/components/schemas/Profile"}')
  from public.profile p where p.id = p_id;
$$;

create or replace view saais_api.profile with (security_barrier = true) as
select
  r.id, r.role,
  array(select distinct a.role from public.role_assignment a
    where a.profile_id = r.id order by a.role) as roles,
  r.email, r.full_name, r.student_number, r.status, saais_private.current_invitation_status(r.invitation_status, r.invitation_expires_at) as invitation_status, r.invitation_sent_at,
  r.invitation_expires_at, r.created_at, r.updated_at, r.faculty_id, r.department_id, r.avatar_url,
  r.consultation_hours
from public.profile r
where saais_private.can_read_profile(r.id, true);
