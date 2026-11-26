create or replace function saais_private.matt_updatesystemsettings(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  department uuid := saais_private.matt_settings_department((p_body->>'department_id')::uuid);
  previous public.system_settings;
  defaults public.system_settings;
  saved public.system_settings;
  warning numeric;
  probation numeric;
  dismissal numeric;
  sender text;
begin
  select s.* into previous
    from public.system_settings s where s.department_id is not distinct from department for update;
  if previous.id is null and department is not null then
    select s.* into defaults from public.system_settings s where s.department_id is null for share;
  end if;

  warning := coalesce((p_body->>'warning_pct')::numeric, previous.warning_pct, defaults.warning_pct);
  probation := coalesce((p_body->>'probation_pct')::numeric, previous.probation_pct, defaults.probation_pct);
  dismissal := coalesce((p_body->>'dismissal_pct')::numeric, previous.dismissal_pct, defaults.dismissal_pct);
  sender := coalesce(p_body->>'sender_email', previous.sender_email, defaults.sender_email);
  if warning is null or probation is null or dismissal is null or sender is null then
    perform saais_private.fail(400, 'Provide all standing thresholds and the sender email when initializing settings.');
  end if;
  if not (warning >= 0 and warning < probation and probation < dismissal and dismissal <= 100) then
    perform saais_private.fail(400, 'Thresholds must satisfy 0 <= warning_pct < probation_pct < dismissal_pct <= 100.');
  end if;
  if sender !~* '^[^[:space:]@]+@[^[:space:]@]+$' or length(sender) > 254 then
    perform saais_private.fail(400, 'Use a valid sender email address.');
  end if;

  if previous.id is null then
    insert into public.system_settings(department_id, warning_pct, probation_pct, dismissal_pct, sender_email)
      values(department, warning, probation, dismissal, sender)
      returning * into saved;
  elsif (warning, probation, dismissal, sender) is distinct from
      (previous.warning_pct, previous.probation_pct, previous.dismissal_pct, previous.sender_email) then
    update public.system_settings
      set warning_pct = warning, probation_pct = probation, dismissal_pct = dismissal,
        sender_email = sender, updated_at = clock_timestamp()
      where id = previous.id returning * into saved;
  else
    return to_jsonb(previous);
  end if;
  insert into public.audit_log_entry(actor_id, actor_name, actor_role, action, action_category,
    entity_type, entity_id, old_value, new_value, created_at)
  select p.id, left(p.full_name, 150), current_setting('saais.authorized_role')::public.role_type,
    'system_settings_updated', 'change', 'system_settings', saved.id,
    case when previous.id is not null then to_jsonb(previous) end, to_jsonb(saved), clock_timestamp()
  from public.profile p where p.id = auth.uid();
  return to_jsonb(saved);
end
$$;
