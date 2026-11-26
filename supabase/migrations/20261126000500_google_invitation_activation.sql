-- Auth writes this provider identity after Google verifies the provider response.
-- Do not infer Google verification from editable user metadata or email alone.
create function saais_private.activate_google_invitation() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_profile public.profile;
  v_invite saais_private.account_invitation;
  v_google_email text := lower(btrim(new.identity_data->>'email'));
begin
  if new.provider <> 'google' or new.identity_data->'email_verified' is distinct from 'true'::jsonb
     or v_google_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@vsu[.]edu[.]ph$' then
    return new;
  end if;
  -- Use the same lock order as password invitation redemption and revoke.
  perform pg_advisory_xact_lock(531201, 1);
  select * into v_invite from saais_private.account_invitation where profile_id = new.user_id for update;
  if not found then return new; end if;
  select * into v_profile from public.profile where id = new.user_id for update;
  if not found or v_profile.status <> 'invited' or v_profile.invitation_status <> 'pending'
    or v_profile.invitation_expires_at <= clock_timestamp()
    or lower(btrim(v_profile.email)) is distinct from v_google_email
    or not exists (select 1 from auth.users u where u.id = new.user_id and lower(btrim(u.email)) = v_google_email)
    or v_invite.redemption_until > clock_timestamp() then
    return new;
  end if;
  update public.profile set status='active', invitation_status='accepted', updated_at=clock_timestamp()
    where id=v_profile.id;
  delete from saais_private.invite_email where profile_id=v_profile.id;
  delete from saais_private.account_invitation where profile_id=v_profile.id;
  insert into public.audit_log_entry(actor_id, actor_name, actor_role, action, action_category, entity_type, entity_id)
    values(v_profile.id, v_profile.full_name, v_profile.role, 'invitation_accepted', 'auth_account', 'profile', v_profile.id);
  return new;
end $$;
revoke all on function saais_private.activate_google_invitation() from public, anon, authenticated;
create trigger saais_activate_google_invitation
  after insert or update of identity_data on auth.identities
  for each row execute function saais_private.activate_google_invitation();
