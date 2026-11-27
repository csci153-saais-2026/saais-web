-- Bound rejected-login webhook deduplication storage to a retention window
-- that covers Auth webhook retries while leaving audit_log_entry intact.
alter table saais_private.rejected_login_webhook
  add column recorded_at timestamptz not null default clock_timestamp();

create index rejected_login_webhook_recorded_at_idx
  on saais_private.rejected_login_webhook (recorded_at);

create function saais_private.prune_rejected_login_webhooks(
  p_retention interval default interval '7 days'
) returns integer
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_deleted integer := 0;
begin
  if p_retention is null or p_retention <= interval '0 seconds' then
    perform saais_private.fail(400, 'Retention interval must be positive.');
  end if;

  delete from saais_private.rejected_login_webhook
    where recorded_at < clock_timestamp() - p_retention;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end $$;

revoke all on function saais_private.prune_rejected_login_webhooks(interval) from public, anon, authenticated;

create or replace function public.saais_record_rejected_login(
  p_reason text,
  p_email_domain text default null,
  p_profile_id uuid default null,
  p_webhook_id text default null
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

  if p_webhook_id is not null then
    perform saais_private.prune_rejected_login_webhooks();
    insert into saais_private.rejected_login_webhook(id_hash, recorded_at)
      values (sha256(convert_to(p_webhook_id, 'UTF8')), clock_timestamp())
      on conflict do nothing;
    if not found then
      return jsonb_build_object('rejection_reason', p_reason, 'duplicate', true);
    end if;
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

-- Schedule a daily cleanup when pg_cron is enabled (00:10 Asia/Manila in UTC).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $job$select cron.schedule(
      'saais-prune-rejected-login-webhooks',
      '10 16 * * *',
      'select saais_private.prune_rejected_login_webhooks()'
    )$job$;
  end if;
end $$;
