create or replace function saais_private.recipients(department uuid, roles text[]) returns uuid[]
language sql stable set search_path=pg_catalog,public as $$
  select coalesce(array_agg(distinct r.profile_id),'{}'::uuid[]) from public.role_assignment r
  left join public.department d on d.id=department where r.role::text=any(roles)
    and (r.role='admin' or (r.role='dean' and r.faculty_id=d.faculty_id) or r.department_id=department or
      (r.role='adviser' and exists(select 1 from public.adviser_assignment a where a.adviser_id=r.profile_id and a.end_date is null
        and (saais_private.organization(a.student_id)->>'department_id')::uuid=department)));
$$;
create function saais_private.alert_candidates(reference_date date, department uuid)
returns table(event text,recipients uuid[],entity text,entity_id uuid,student uuid,dedupe text,title text)
language sql stable set search_path=pg_catalog,public as $$
  with students as (
    select p.id,coalesce((saais_private.organization(p.id)->>'department_id')::uuid,p.department_id) as department_id,
      (saais_private.organization(p.id)->>'adviser_id')::uuid as adviser_id
    from public.profile p where p.role='student' and p.status in ('active','invited')
  ), unresolved as (
    select a.*,s.department_id,s.adviser_id from public.attempt a join students s on s.id=a.student_id
    where a.status='inc' and not exists(select 1 from public.inc_resolution i where i.attempt_id=a.id)
      and (department is null or s.department_id=department)
  ), standing as (
    select a.student_id,o.school_term_id,s.department_id,s.adviser_id,
      sum(case when a.status='failed' or (a.status='inc' and i.completion_grade>3) or
        (a.status='inc' and i.id is null and a.inc_deadline<reference_date) then a.units_attempted else 0 end) as failed_units,
      sum(a.units_attempted) as attempted_units,v.delinquency_threshold,
      coalesce(ds.warning_pct,gs.warning_pct) as warning,coalesce(ds.probation_pct,gs.probation_pct) as probation,coalesce(ds.dismissal_pct,gs.dismissal_pct) as dismissal
    from public.attempt a join students s on s.id=a.student_id join public.course_offering o on o.id=a.course_offering_id
    join public.school_term st on st.id=o.school_term_id
    join public.student_curriculum_assignment ca on ca.student_id=a.student_id and ca.start_date<=st.ends_on and (ca.end_date is null or ca.end_date>st.ends_on)
    join public.curriculum_version v on v.id=ca.curriculum_version_id
    left join public.inc_resolution i on i.attempt_id=a.id
    left join public.system_settings ds on ds.department_id=s.department_id
    left join public.system_settings gs on gs.department_id is null
    where department is null or s.department_id=department
    group by a.student_id,o.school_term_id,s.department_id,s.adviser_id,v.delinquency_threshold,ds.warning_pct,gs.warning_pct,ds.probation_pct,gs.probation_pct,ds.dismissal_pct,gs.dismissal_pct
  ), standing_levels as (
    select *,case when delinquency_threshold>0 and failed_units>=delinquency_threshold then 'delinquency'
      when failed_units*100/nullif(attempted_units,0)>=dismissal then 'dismissal'
      when failed_units*100/nullif(attempted_units,0)>=probation then 'probation'
      when failed_units*100/nullif(attempted_units,0)>=warning then 'warning' end as level from standing
  ), invite_scope as (
    select p.id,p.invitation_expires_at,coalesce(p.department_id,(saais_private.organization(p.id)->>'department_id')::uuid,
      (select r.department_id from public.role_assignment r where r.profile_id=p.id and r.department_id is not null order by r.created_at,r.id limit 1)) as department_id
    from public.profile p where p.status='invited' and p.invitation_status='pending'
  )
  select 'inc_deadline_approaching',array[u.student_id,u.adviser_id],'attempt',u.id,u.student_id,
    'inc-near:'||u.id||':'||u.inc_deadline||':'||(u.inc_deadline-reference_date),'INC deadline approaching'
    from unresolved u where u.inc_deadline-reference_date in (30,14,7)
  union all
  select 'inc_lapsed',array[u.student_id,u.adviser_id]||saais_private.recipients(u.department_id,array['department_head']),'attempt',u.id,u.student_id,
    'inc-lapsed:'||u.id||':'||u.inc_deadline,'INC deadline has lapsed' from unresolved u where u.inc_deadline<reference_date
  union all
  select 'standing_threshold_alert',array[s.student_id,s.adviser_id]||saais_private.recipients(s.department_id,array['department_head','dean']),
    'school_term',s.school_term_id,s.student_id,'standing:'||s.student_id||':'||s.school_term_id||':'||s.level||':'||s.failed_units,'Academic standing threshold reached'
    from standing_levels s where s.level is not null and s.failed_units>0
  union all
  select 'encoding_deadline_approaching',saais_private.recipients(d.id,array['adviser','department_staff','department_head']),
    'school_term',t.id,null::uuid,'encoding:'||t.id||':'||d.id||':'||t.encoding_deadline||':'||(t.encoding_deadline-reference_date),'Grade encoding deadline approaching'
    from public.school_term t cross join public.department d where not t.is_locked and t.encoding_deadline-reference_date in (7,3,1)
      and (department is null or d.id=department) and not exists(select 1 from public.department_term_encoding c where c.school_term_id=t.id and c.department_id=d.id and c.is_closed)
  union all
  select 'unassigned_students_pending',saais_private.recipients(s.department_id,array['department_head','department_staff','admin']),
    'profile',s.id,s.id,'unassigned:'||s.id,'Student adviser assignment pending' from students s
    where s.adviser_id is null and (department is null or s.department_id=department)
  union all
  select 'invitation_expiring_soon',saais_private.recipients(i.department_id,array['department_head','department_staff','admin']),
    'profile',i.id,null::uuid,'invite:'||i.id||':'||i.invitation_expires_at::text||':'||((i.invitation_expires_at at time zone 'Asia/Manila')::date-reference_date),'Account invitation expiring soon'
    from invite_scope i where (i.invitation_expires_at at time zone 'Asia/Manila')::date-reference_date in (3,1) and (department is null or i.department_id=department)
  union all
  select 'backup_overdue_reminder',saais_private.recipients(s.department_id,array['department_head','admin']),
    'system_settings',s.id,null::uuid,'backup:'||s.id||':'||coalesce(s.last_backup_at::text,'never'),'Academic records backup overdue'
    from public.system_settings s cross join saais_private.alert_configuration c where c.backup_overdue_days is not null and
      (s.last_backup_at is null or reference_date-(s.last_backup_at at time zone 'Asia/Manila')::date>=c.backup_overdue_days)
      and (department is null or s.department_id=department);
$$;
create function saais_private.evaluate_alerts(body jsonb, department uuid default null) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare reference_date date:=coalesce((body->>'reference_date')::date,(now() at time zone 'Asia/Manila')::date);
  dry_run boolean:=coalesce((body->>'dry_run')::boolean,false); candidate record; recipient uuid; key text; notification jsonb;
  created jsonb:='[]'; counts jsonb:='{"inc_deadline_approaching":0,"inc_lapsed":0,"standing_threshold_alert":0,"encoding_deadline_approaching":0,"unassigned_students_pending":0,"invitation_expiring_soon":0,"backup_overdue_reminder":0,"skipped_duplicates":0,"total_created":0}'; n integer;
begin
  for candidate in select * from saais_private.alert_candidates(reference_date,department) order by event,entity_id,dedupe loop
    for recipient in select distinct p.id from public.profile p where p.id=any(candidate.recipients) and p.status='active' order by p.id loop
      key:=candidate.dedupe||':'||recipient;
      if exists(select 1 from public.notification nn where nn.dedupe_key=key) then
        counts:=jsonb_set(counts,'{skipped_duplicates}',to_jsonb((counts->>'skipped_duplicates')::int+1)); continue; end if;
      counts:=jsonb_set(counts,array[candidate.event],to_jsonb((counts->>candidate.event)::int+1));
      if dry_run or jsonb_array_length(created)>=500 then continue; end if;
      insert into public.notification(recipient_id,kind,event_type,title,body,target_student_id,entity_type,entity_id,dedupe_key,email_delivery_status)
        values(recipient,'alert',candidate.event,candidate.title,'Review the academic record for details.',candidate.student,candidate.entity,candidate.entity_id,key,'pending')
        on conflict(dedupe_key) do nothing returning to_jsonb(public.notification.*) into notification;
      if found then created:=created||jsonb_build_array(notification);
      else counts:=jsonb_set(counts,'{skipped_duplicates}',to_jsonb((counts->>'skipped_duplicates')::int+1)); end if;
    end loop;
  end loop;
  counts:=jsonb_set(counts,'{total_created}',to_jsonb(jsonb_array_length(created)));
  return jsonb_build_object('reference_date',reference_date,'dry_run',dry_run,'evaluated_counts',counts,'created_notifications',created);
end $$;

create function saais_private.notifications(operation text, body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
#variable_conflict use_variable
declare department uuid:=(body->>'department_id')::uuid; choices integer; ids uuid[]; updated integer;
begin
  if operation='markNotificationsRead' then
    -- Exactly one target mode is meaningful. is_read alone cannot identify rows.
    if ((case when body->>'notification_id' is not null then 1 else 0 end)+
      (case when body ? 'notification_ids' then 1 else 0 end)+(case when coalesce((body->>'mark_all')::boolean,false) then 1 else 0 end))<>1 then
      perform saais_private.fail(400,'Choose one notification, a list, or mark_all.'); end if;
    select array_agg(value::uuid) into ids from jsonb_array_elements_text(coalesce(body->'notification_ids',jsonb_build_array(body->>'notification_id'))) value;
    if not coalesce((body->>'mark_all')::boolean,false) and exists(select 1 from public.notification n where n.id=any(ids) and n.recipient_id<>auth.uid()) then
      perform saais_private.fail(403,'Notifications belong to another recipient.'); end if;
    update public.notification n set is_read=coalesce((body->>'is_read')::boolean,true),
      read_at=case when coalesce((body->>'is_read')::boolean,true) then clock_timestamp() end
      where n.recipient_id=auth.uid() and (coalesce((body->>'mark_all')::boolean,false) or n.id=any(ids));
    get diagnostics updated=row_count;
    return jsonb_build_object('updated_count',updated);
  end if;
  if department is null and not saais_private.has_role('admin') then
    select count(distinct r.department_id),(array_agg(distinct r.department_id))[1] into choices,department
      from public.role_assignment r where r.profile_id=auth.uid() and r.role='department_head';
    if choices<>1 then perform saais_private.fail(400,'Specify one of your assigned departments.'); end if;
  end if;
  perform saais_private.require_scope(array['department_head','admin'],department);
  if department is not null and not exists(select 1 from public.department d where d.id=department) then perform saais_private.fail(400,'Invalid department scope.'); end if;
  return saais_private.evaluate_alerts(body,department);
end $$;
-- Daily production entry point, inaccessible to browser roles. With pg_cron
-- enabled, install the job below. cron.timezone must be UTC (00:05 Manila).
create function saais_private.scheduled_alerts() returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
begin perform pg_advisory_xact_lock(531201,1); return saais_private.evaluate_alerts('{}',null); end $$;
do $$begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    execute $schedule$select cron.schedule('saais-daily-alerts','5 16 * * *','select saais_private.scheduled_alerts()')$schedule$;
  end if;
end$$;
