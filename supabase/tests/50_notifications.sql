do $$declare student uuid:='00000005-0000-4000-8000-000000000000'; department uuid; other uuid; term uuid; faculty uuid;
  result jsonb; again jsonb; before_count bigint; c jsonb; o jsonb; near_id uuid; lapsed_id uuid; notification uuid; wrong uuid; event text;
begin
  perform test.login(1);
  select (value->>'id')::uuid into department from test.records where name='department';
  select (value->>'id')::uuid into other from test.records where name='department_b';
  select (value->>'id')::uuid into term from test.records where name='school_term';
  perform test.call('updateSchoolTerm',jsonb_build_object('id',term),'{"is_locked":false,"encoding_deadline":"2026-11-19"}');
  foreach event in array array['NEAR','LAPSED'] loop
    c:=test.call('createCourse','{}',jsonb_build_object('department_id',department,'code','INC-'||event,'title','INC Test '||event,'units',3));
    o:=test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',c->>'id'));
    insert into public.attempt(student_id,course_offering_id,status,inc_deadline,units_attempted,created_by,updated_by)
      values(student,(o->>'id')::uuid,'inc',case when event='NEAR' then '2026-11-19'::date else '2026-11-11'::date end,3,'00000004-0000-4000-8000-000000000000','00000004-0000-4000-8000-000000000000');
  end loop;
  insert into auth.users(id) values('00000011-0000-4000-8000-000000000000'),('00000012-0000-4000-8000-000000000000');
  insert into public.profile(id,role,email,full_name,status,student_number,department_id) values
    ('00000011-0000-4000-8000-000000000000','student','pending@example.test','Unassigned Test Student','invited','TEST-11',department);
  insert into public.role_assignment(profile_id,role) values('00000011-0000-4000-8000-000000000000','student');
  insert into public.profile(id,role,email,full_name,status,department_id,invitation_status,invitation_expires_at) values
    ('00000012-0000-4000-8000-000000000000','department_staff','invite@example.test','Invited Test Staff','invited',department,'pending','2026-11-15 12:00:00+08');
  insert into public.role_assignment(profile_id,role,department_id) values('00000012-0000-4000-8000-000000000000','department_staff',department);
  insert into public.system_settings(department_id,warning_pct,probation_pct,dismissal_pct,sender_email,last_backup_at)
    values(department,25,50,75,'sender@example.test','2026-09-01T00:00:00Z');
  update saais_private.alert_configuration set backup_overdue_days=30;
  perform test.login(2);
  perform test.expect('PT403','evaluateScheduledNotifications','{}',jsonb_build_object('department_id',other));
  select count(*) into before_count from public.notification;
  result:=test.call('evaluateScheduledNotifications','{}','{"reference_date":"2026-11-12","dry_run":true}');
  perform test.assert((select count(*)=before_count from public.notification),'dry-run wrote notifications');
  perform test.assert(jsonb_array_length(result->'created_notifications')=0,'dry-run returned created rows');
  result:=test.call('evaluateScheduledNotifications','{}','{"reference_date":"2026-11-12"}');
  foreach event in array array['inc_deadline_approaching','inc_lapsed','standing_threshold_alert','encoding_deadline_approaching','unassigned_students_pending','invitation_expiring_soon','backup_overdue_reminder'] loop
    perform test.assert((result->'evaluated_counts'->>event)::int>0,'missing scheduled rule: '||event);
  end loop;
  again:=test.call('evaluateScheduledNotifications','{}','{"reference_date":"2026-11-12"}');
  perform test.assert((again->'evaluated_counts'->>'total_created')::int=0,'scheduled alerts duplicated');
  perform test.assert((again->'evaluated_counts'->>'skipped_duplicates')::int>0,'dedupe not reported');
  perform test.assert((select bool_and(a.status='inc') from public.attempt a where a.inc_deadline is not null),'evaluation mutated INC status');
  select n.id into notification from public.notification n where n.recipient_id=student limit 1;
  select n.id into wrong from public.notification n where n.recipient_id<>student limit 1;
  perform test.login(5);
  perform test.expect('PT403','markNotificationsRead','{}',jsonb_build_object('notification_id',wrong));
  perform test.expect('PT400','markNotificationsRead','{}','{"is_read":true}');
  perform test.expect('PT400','markNotificationsRead','{}',jsonb_build_object('notification_id',notification,'mark_all',true));
  result:=test.call('markNotificationsRead','{}',jsonb_build_object('notification_id',notification));
  perform test.assert((result->>'updated_count')::int=1,'single notification read');
  result:=test.call('markNotificationsRead','{}',jsonb_build_object('notification_ids',jsonb_build_array(notification),'is_read',false));
  perform test.assert((select not n.is_read and n.read_at is null from public.notification n where n.id=notification),'unread did not clear read_at');
  result:=test.call('markNotificationsRead','{}','{"mark_all":true}');
  perform test.assert((select bool_and(is_read) from public.notification where recipient_id=student),'mark all ownership');
  perform test.expect('PT403','evaluateScheduledNotifications','{}','{}');
end$$;
