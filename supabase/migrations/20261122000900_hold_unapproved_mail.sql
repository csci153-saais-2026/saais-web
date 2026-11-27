-- Filter before leasing to preserve queued messages and their retry budgets.
-- NULL is reserved for the worker's explicit unrestricted production mode.
drop function public.saais_claim_email();
create function public.saais_claim_email(p_allowed_recipients text[])
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
    select m.id from saais_private.invite_email m
    join public.profile p on p.id = m.profile_id
    where m.available_at <= now() and m.attempts < 8
      and (p_allowed_recipients is null or lower(btrim(p.email)) = any(p_allowed_recipients))
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
    join public.profile p on p.id = n.recipient_id
    where n.email_delivery_status = 'pending' and coalesce(m.available_at <= now() and m.attempts < 8, true)
      and (p_allowed_recipients is null or lower(btrim(p.email)) = any(p_allowed_recipients))
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

revoke all on function public.saais_claim_email(text[]) from public, anon, authenticated;
grant execute on function public.saais_claim_email(text[]) to service_role;
