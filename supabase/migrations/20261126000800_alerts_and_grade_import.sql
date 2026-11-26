-- The public on-demand endpoint retains its bounded response. The private cron
-- writes every due candidate, using the existing unique dedupe keys for retries.
create or replace function saais_private.scheduled_alerts() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_date date := (now() at time zone 'Asia/Manila')::date;
  v_created integer;
begin
  perform pg_advisory_xact_lock(531201,1);
  with inserted as (
    insert into public.notification(recipient_id,kind,event_type,title,body,target_student_id,entity_type,entity_id,dedupe_key,email_delivery_status)
    select distinct p.id,'alert',c.event,c.title,'Review the academic record for details.',c.student,c.entity,c.entity_id,
      c.dedupe||':'||p.id,'pending'
    from saais_private.alert_candidates(v_date,null) c
    join public.profile p on p.id=any(c.recipients) and p.status='active'
    on conflict(dedupe_key) do nothing returning 1
  ) select count(*) into v_created from inserted;
  return jsonb_build_object('reference_date',v_date,'total_created',v_created);
end $$;

-- Imports may create grades but must not replace an already recorded result.
-- Corrections use the separate audited operation with an explicit reason.
alter function saais_private.matt_record_grade_row(uuid,jsonb,public.school_term,jsonb,text)
  rename to matt_record_grade_row_unchecked_import;
create function saais_private.matt_record_grade_row(
  p_student_id uuid, p_org jsonb, p_term public.school_term, p_row jsonb, p_operation text
) returns uuid language plpgsql set search_path = pg_catalog as $$
declare previous public.attempt;
begin
  if p_operation = 'importGradesBatch' then
    select * into previous from public.attempt a where a.student_id=p_student_id
      and a.course_offering_id=(p_row->>'course_offering_id')::uuid for update;
    if found and (
      (previous.midterm_grade is not null and p_row ? 'midterm_grade'
        and previous.midterm_grade is distinct from (p_row->>'midterm_grade')::numeric)
      or (previous.final_grade is not null and p_row ? 'final_grade'
        and previous.final_grade is distinct from (p_row->>'final_grade')::numeric)
      or (previous.midterm_status is not null and p_row ? 'midterm_status'
        and previous.midterm_status is distinct from p_row->>'midterm_status')
      or (previous.status <> 'currently_enrolled' and p_row ? 'status'
        and previous.status::text is distinct from p_row->>'status')
    ) then
      perform saais_private.matt_grade_conflict('GRADE_ALREADY_RECORDED',
        'Use grade correction with a reason for an existing result.');
    end if;
  end if;
  return saais_private.matt_record_grade_row_unchecked_import(p_student_id,p_org,p_term,p_row,p_operation);
end $$;
revoke all on function saais_private.matt_record_grade_row(uuid,jsonb,public.school_term,jsonb,text),
  saais_private.matt_record_grade_row_unchecked_import(uuid,jsonb,public.school_term,jsonb,text) from public, anon, authenticated;
