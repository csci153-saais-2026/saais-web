create unique index audit_successful_sign_in_once_per_session
  on public.audit_log_entry ((new_value->>'session_hash'))
  where action = 'sign_in_succeeded';

create or replace function public.saais_evaluate_access_token(
  p_event jsonb, p_webhook_id text default null
) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_user_text text := p_event->>'user_id';
  v_session_text text := p_event->'claims'->>'session_id';
  v_method text := p_event->>'authentication_method';
  v_profile public.profile;
  v_reason text;
  v_message text := 'An active provisioned profile is required.';
  v_domain text := nullif(split_part(lower(btrim(coalesce(p_event->'claims'->>'email', ''))), '@', 2), '');
begin
  if v_user_text is null or v_user_text !~* v_uuid_pattern then
    v_reason := 'invalid_auth_event';
  else
    select * into v_profile from public.profile where id = v_user_text::uuid;
    if v_profile.id is not null then
      v_domain := nullif(split_part(lower(btrim(v_profile.email)), '@', 2), '');
    end if;
    if v_profile.status = 'disabled' then
      v_reason := 'disabled_account';
      v_message := 'This institutional account is disabled.';
    elsif v_profile.status is distinct from 'active' then
      v_reason := 'unprovisioned_account';
    end if;
  end if;

  if v_reason is not null then
    perform public.saais_record_rejected_login(v_reason, v_domain, v_profile.id, p_webhook_id);
    return jsonb_build_object('allowed', false, 'http_code', 403,
      'message', v_message, 'rejection_reason', v_reason);
  end if;

  -- A refresh or an additional factor can issue another token for the same session.
  if v_method in ('password', 'oauth', 'otp', 'magiclink', 'sso/saml')
    and v_session_text ~* v_uuid_pattern then
    insert into public.audit_log_entry (
      actor_id, actor_name, actor_role, student_id, action, action_category,
      entity_type, entity_id, new_value
    ) values (
      v_profile.id, v_profile.full_name, v_profile.role,
      case when v_profile.role = 'student' then v_profile.id end,
      'sign_in_succeeded', 'sign_in', 'profile', v_profile.id,
      jsonb_build_object('session_hash', encode(sha256(convert_to(lower(v_session_text), 'UTF8')), 'hex'))
    )
    on conflict ((new_value->>'session_hash')) where action = 'sign_in_succeeded' do nothing;
  end if;

  return '{"allowed":true}'::jsonb;
end $$;
