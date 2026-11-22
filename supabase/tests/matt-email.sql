do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  message_id uuid;
  first_lease uuid;
  later_lease uuid;
begin
  insert into public.notification(recipient_id,kind,event_type,title,body,email_delivery_status)
  values(student,'person','adviser_assigned','Private notification','Private fixture text','pending')
  returning id into message_id;
  select c.lease into first_lease from public.saais_claim_email() c where c.id = message_id;
  perform test.assert(first_lease is not null, 'The worker can claim a pending notification');
  perform test.assert(not exists(select 1 from public.saais_claim_email() c where c.id = message_id),
    'An active lease prevents duplicate delivery');
  perform public.saais_finish_email(message_id,'notification',first_lease,'retry');
  perform test.assert(not exists(select 1 from public.saais_claim_email() c where c.id = message_id),
    'A retry backs off before reclaiming the message');
  update saais_private.notification_email set available_at = now() - interval '1 second'
    where notification_id = message_id;
  select c.lease into later_lease from public.saais_claim_email() c where c.id = message_id;
  perform test.assert(later_lease is not null and later_lease <> first_lease, 'A recovered delivery gets a fresh lease');
  perform public.saais_finish_email(message_id,'notification',first_lease,'sent');
  perform test.assert((select email_delivery_status = 'pending' from public.notification where id = message_id),
    'A stale completion cannot replace the current lease');
  perform public.saais_finish_email(message_id,'notification',later_lease,'sent');
  perform test.assert((select email_delivery_status = 'sent' from public.notification where id = message_id),
    'The current worker can record successful delivery');
  perform test.assert(not has_function_privilege('authenticated','public.saais_claim_email()', 'EXECUTE'),
    'Browser callers cannot claim or see delivery payloads');
end;
$$;
