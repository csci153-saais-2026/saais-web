-- Limit each existing invitation token independently. The foreign key bounds
-- storage to issued invitations and removes counters when invitations are deleted.
create table saais_private.public_invitation_budget (
  operation text not null check (operation in ('previewInviteToken','verifyInviteToken','declineInviteToken')),
  token_hash text not null references saais_private.account_invitation(token_hash) on update cascade on delete cascade,
  primary key (operation, token_hash),
  window_start timestamptz not null,
  count integer not null check (count between 1 and 60)
);
revoke all on saais_private.public_invitation_budget from public, anon, authenticated;

-- A reissued link starts a fresh budget; changing no token keeps existing counters.
create function saais_private.clear_rotated_invitation_budget() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if new.token_hash is distinct from old.token_hash then
    delete from saais_private.public_invitation_budget where token_hash = old.token_hash;
  end if;
  return new;
end;
$$;
create trigger clear_rotated_invitation_budget before update of token_hash
on saais_private.account_invitation for each row
execute function saais_private.clear_rotated_invitation_budget();


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
