alter table saais_private.invite_email add column lease uuid;

create table saais_private.notification_email (
  notification_id uuid primary key references public.notification(id),
  lease uuid,
  available_at timestamptz not null default now(),
  attempts integer not null default 0
);
revoke all on saais_private.notification_email from public, anon, authenticated;

create function public.saais_claim_email()
returns table (id uuid, kind text, lease uuid, email text, subject text, message text, token text)
language plpgsql security definer set search_path = pg_catalog as $$
#variable_conflict use_column
begin
  perform pg_advisory_xact_lock(531201, 3);
  delete from saais_private.invite_email m using public.profile p
  where p.id = m.profile_id and (p.status <> 'invited' or p.invitation_status <> 'pending'
    or p.invitation_expires_at <= now() or (m.attempts >= 8 and m.available_at <= now()));
  update public.notification n set email_delivery_status = 'skipped'
  from public.profile p
  where n.recipient_id = p.id and n.email_delivery_status = 'pending' and p.status <> 'active';
  update public.notification n set email_delivery_status = 'failed'
  from saais_private.notification_email m
  where m.notification_id = n.id and n.email_delivery_status = 'pending'
    and m.attempts >= 8 and m.available_at <= now();

  return query
  with candidates as (
    select m.id from saais_private.invite_email m where m.available_at <= now() and m.attempts < 8
    order by m.available_at, m.id limit 12
  ), claimed as (
    update saais_private.invite_email m set
      available_at = now() + interval '2 minutes', lease = gen_random_uuid(), attempts = m.attempts + 1
    from candidates c where m.id = c.id returning m.*
  )
  select m.id, 'invitation'::text, m.lease, p.email, 'Set up your SAAIS account'::text, null::text, m.token
  from claimed m join public.profile p on p.id = m.profile_id;

  return query
  with candidates as (
    select n.id from public.notification n
    left join saais_private.notification_email m on m.notification_id = n.id
    where n.email_delivery_status = 'pending' and coalesce(m.available_at <= now() and m.attempts < 8, true)
    order by n.created_at, n.id limit 12
  ), claimed as (
    insert into saais_private.notification_email as m(notification_id, available_at, lease, attempts)
    select c.id, now() + interval '2 minutes', gen_random_uuid(), 1 from candidates c
    on conflict (notification_id) do update set
      available_at = excluded.available_at, lease = excluded.lease, attempts = m.attempts + 1
    returning m.notification_id, m.lease
  )
  select n.id, 'notification'::text, m.lease, p.email, 'A new SAAIS notification'::text,
    'Sign in to SAAIS to read your new notification.'::text, null::text
  from claimed m join public.notification n on n.id = m.notification_id
  join public.profile p on p.id = n.recipient_id where p.status = 'active';
end;
$$;

create function public.saais_finish_email(p_id uuid, p_kind text, p_lease uuid, p_outcome text)
returns void language plpgsql security definer set search_path = pg_catalog as $$
declare
  n integer;
begin
  if p_outcome not in ('sent','retry','failed') then
    perform saais_private.fail(400, 'Invalid delivery outcome.');
  end if;
  if p_kind = 'invitation' then
    if p_outcome = 'retry' then
      update saais_private.invite_email
        set lease = null, available_at = now() + make_interval(mins => least(60, 2 ^ attempts::integer)::integer)
        where id = p_id and lease = p_lease;
    else
      delete from saais_private.invite_email where id = p_id and lease = p_lease;
    end if;
  elsif p_kind = 'notification' then
    update saais_private.notification_email
      set lease = null, available_at = now() + make_interval(mins => least(60, 2 ^ attempts::integer)::integer)
      where notification_id = p_id and lease = p_lease returning attempts into n;
    if found and (p_outcome <> 'retry' or n >= 8) then
      update public.notification set email_delivery_status = case when p_outcome = 'sent' then 'sent' else 'failed' end
      where id = p_id and email_delivery_status = 'pending';
    end if;
  end if;
end;
$$;

revoke all on function public.saais_claim_email(), public.saais_finish_email(uuid,text,uuid,text)
  from public, anon, authenticated;
grant execute on function public.saais_claim_email(), public.saais_finish_email(uuid,text,uuid,text) to service_role;
