-- Server-side durable rejected-login audit helpers for signed HTTP Auth Hooks.
-- Unlike a PostgreSQL Auth Hook whose transaction rolls back when returning an
-- error, an HTTP Auth Hook invokes these service-only RPCs in an independent
-- transaction so login_rejected audit entries survive Auth rejection.
create function public.saais_record_rejected_login(
  p_reason text,
  p_email_domain text default null,
  p_profile_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_domain text;
  v_profile public.profile;
  v_summary text;
  v_entry_id uuid;
begin
  if p_reason is null or p_reason not in (
    'non_institutional_domain', 'unprovisioned_account', 'disabled_account', 'invalid_auth_event'
  ) then
    perform saais_private.fail(400, 'Invalid rejected-login reason.');
  end if;

  if p_email_domain is not null then
    v_domain := nullif(regexp_replace(lower(btrim(p_email_domain)), '^.*@', ''), '');
    if v_domain is not null and v_domain !~ '^[a-z0-9.-]{1,100}$' then
      v_domain := null;
    end if;
  end if;

  if p_profile_id is not null then
    select * into v_profile from public.profile where id = p_profile_id;
  end if;

  v_summary := case p_reason
    when 'non_institutional_domain' then 'Rejected non-institutional authentication attempt.'
    when 'unprovisioned_account' then 'Rejected unprovisioned authentication attempt.'
    when 'disabled_account' then 'Rejected disabled-account authentication attempt.'
    else 'Rejected malformed authentication event.'
  end;

  insert into public.audit_log_entry (
    actor_id, actor_name, actor_role, student_id, action, action_category,
    entity_type, entity_id, new_value, reason
  ) values (
    null, 'Authentication Gate', null,
    case when v_profile.role = 'student' then v_profile.id end,
    'login_rejected', 'auth_account',
    case when v_profile.id is not null then 'profile' else 'auth_attempt' end,
    v_profile.id,
    jsonb_strip_nulls(jsonb_build_object(
      'rejection_reason', p_reason,
      'email_domain', v_domain
    )),
    v_summary
  ) returning id into v_entry_id;

  return jsonb_build_object('audit_id', v_entry_id, 'rejection_reason', p_reason);
end $$;

create function public.saais_evaluate_before_user_created(p_event jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_email text := lower(btrim(coalesce(p_event->'user'->>'email', '')));
  v_domain text;
  v_reservation text := p_event->'user'->'app_metadata'->>'saais_provisioning_id';
  v_disabled_id uuid;
  v_message text := 'This institutional account is not pre-registered. Contact your department administrator.';
begin
  if v_email = '' or position('@' in v_email) = 0 then
    perform public.saais_record_rejected_login('invalid_auth_event');
    return jsonb_build_object('allowed', false, 'http_code', 403, 'message', v_message,
      'rejection_reason', 'invalid_auth_event');
  end if;

  v_domain := nullif(split_part(v_email, '@', 2), '');
  if v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@vsu[.]edu[.]ph$' then
    perform public.saais_record_rejected_login('non_institutional_domain', v_domain);
    return jsonb_build_object('allowed', false, 'http_code', 403, 'message', v_message,
      'rejection_reason', 'non_institutional_domain');
  end if;

  select p.id into v_disabled_id
    from public.profile p
    where lower(btrim(p.email)) = v_email and p.status = 'disabled'
    limit 1;
  if v_disabled_id is not null then
    perform public.saais_record_rejected_login('disabled_account', v_domain, v_disabled_id);
    return jsonb_build_object('allowed', false, 'http_code', 403,
      'message', 'This institutional account is disabled.',
      'rejection_reason', 'disabled_account');
  end if;

  if v_reservation is null or not exists (
    select 1 from saais_private.invite_reservation r
    where r.id::text = v_reservation and r.email = v_email and r.profile_id is null
  ) then
    perform public.saais_record_rejected_login('unprovisioned_account', v_domain);
    return jsonb_build_object('allowed', false, 'http_code', 403, 'message', v_message,
      'rejection_reason', 'unprovisioned_account');
  end if;

  return '{"allowed":true}'::jsonb;
end $$;

create function public.saais_evaluate_access_token(p_event jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_user_text text := p_event->>'user_id';
  v_profile public.profile;
  v_claim_domain text := nullif(split_part(lower(btrim(coalesce(p_event->'claims'->>'email', ''))), '@', 2), '');
begin
  if v_user_text is null or v_user_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform public.saais_record_rejected_login('invalid_auth_event', v_claim_domain);
    return jsonb_build_object('allowed', false, 'http_code', 403,
      'message', 'An active provisioned profile is required.',
      'rejection_reason', 'invalid_auth_event');
  end if;

  select * into v_profile from public.profile where id = v_user_text::uuid;
  if not found then
    perform public.saais_record_rejected_login('unprovisioned_account', v_claim_domain);
    return jsonb_build_object('allowed', false, 'http_code', 403,
      'message', 'An active provisioned profile is required.',
      'rejection_reason', 'unprovisioned_account');
  end if;

  if v_profile.status = 'disabled' then
    perform public.saais_record_rejected_login('disabled_account',
      nullif(split_part(lower(btrim(v_profile.email)), '@', 2), ''), v_profile.id);
    return jsonb_build_object('allowed', false, 'http_code', 403,
      'message', 'This institutional account is disabled.',
      'rejection_reason', 'disabled_account');
  end if;

  return '{"allowed":true}'::jsonb;
end $$;

revoke all on function
  public.saais_record_rejected_login(text, text, uuid),
  public.saais_evaluate_before_user_created(jsonb),
  public.saais_evaluate_access_token(jsonb)
  from public, anon, authenticated;
grant execute on function
  public.saais_record_rejected_login(text, text, uuid),
  public.saais_evaluate_before_user_created(jsonb),
  public.saais_evaluate_access_token(jsonb)
  to service_role;
