-- Fixtures provided by the existing PostgreSQL contract harness.
do $$
declare
  department uuid := (select (value->>'id')::uuid from test.records where name = 'department');
  other_department uuid := (select (value->>'id')::uuid from test.records where name = 'department_b');
  student uuid := '00000005-0000-4000-8000-000000000000';
  other_student uuid := '00000009-0000-4000-8000-000000000000';
  head_actor uuid := '00000002-0000-4000-8000-000000000000';
  prior_probation numeric;
  settings_id uuid;
  result jsonb;
  audit_id uuid;
begin
  perform test.login(1);
  result := public.matt_operation('updateSystemSettings', '{}',
    '{"warning_pct":20,"probation_pct":40,"dismissal_pct":60,"sender_email":"notification@vsu.edu.ph"}');
  perform test.assert(result->>'department_id' is null, 'Admin defaults to institutional settings.');

  perform test.login(2);
  select probation_pct into prior_probation from public.system_settings where department_id = department;
  result := public.matt_operation('updateSystemSettings', '{}',
    '{"warning_pct":26,"sender_email":"head-settings-test@vsu.edu.ph"}');
  settings_id := (result->>'id')::uuid;
  perform test.assert((result->>'department_id')::uuid = department and
    (result->>'probation_pct')::numeric = coalesce(prior_probation, 40),
    'Head settings default to assigned department and preserve unmodified or inherited values.');
  perform test.assert(exists (
    select 1 from public.audit_log_entry where entity_id = settings_id and actor_id = head_actor
      and actor_role = 'department_head' and action_category = 'change'
  ), 'Settings write records the scoped actor and category.');

  begin
    perform public.matt_operation('updateSystemSettings', '{}', jsonb_build_object('department_id', other_department, 'warning_pct', 27));
    raise exception 'Cross-department settings write was accepted.';
  exception when sqlstate 'PT403' then null;
  end;
  begin
    perform public.matt_operation('updateSystemSettings', '{}', '{"warning_pct":100}');
    raise exception 'Invalid threshold order was accepted.';
  exception when sqlstate 'PT400' then null;
  end;

  result := public.matt_operation('recordCompletedBackup', '{}',
    '{"scope":"department_records_and_audit_log","backup_reference":"BKP-TEST","backup_label":"Test recovery snapshot"}');
  perform test.assert((result->>'last_backup_by')::uuid = head_actor and result->>'last_backup_reference' = 'BKP-TEST',
    'Backup uses the authenticated actor and preserves the reference.');
  perform test.assert(exists (
    select 1 from public.audit_log_entry where entity_id = settings_id and action = 'backup_completed'
      and reason = 'Test recovery snapshot'
  ), 'Backup metadata and audit entry are persisted in the same operation.');
  begin
    perform public.matt_operation('recordCompletedBackup', '{}', '{"scope":"institution_wide"}');
    raise exception 'Department Head recorded an institution-wide backup.';
  exception when sqlstate 'PT403' then null;
  end;

  perform test.login(5);
  result := public.matt_operation('recordAuditViewEvent', '{}', jsonb_build_object('event_type', 'pdf_exported', 'student_id', student));
  audit_id := (result->>'id')::uuid;
  perform test.assert(exists (
    select 1 from public.audit_log_entry where id = audit_id and actor_id = student and student_id = student
      and actor_role = 'student' and action_category = 'export'
  ), 'Student can audit an export of their own record.');
  begin
    perform public.matt_operation('recordAuditViewEvent', '{}', jsonb_build_object('event_type', 'student_record_viewed', 'student_id', other_student));
    raise exception 'Student created an audit event for another student.';
  exception when sqlstate 'PT403' then null;
  end;
  begin
    perform public.matt_operation('recordAuditViewEvent', '{}', '{"event_type":"sign_in_succeeded"}');
    raise exception 'Authenticated client created an Auth lifecycle event.';
  exception when sqlstate 'PT400' then null;
  end;
  perform test.login(2);
  result := public.matt_operation('recordAuditViewEvent', '{}', '{"event_type":"report_viewed","report_type":"department"}');
  perform test.assert((result->>'entity_id')::uuid = department and result->>'action_category' = 'view',
    'Department report event resolves its authorized target.');
  begin
    perform public.matt_operation('recordAuditViewEvent', '{}', jsonb_build_object(
      'event_type', 'report_viewed', 'report_type', 'department',
      'report_filters', jsonb_build_object('department_id', other_department)
    ));
    raise exception 'Department Head recorded an event outside report scope.';
  exception when sqlstate 'PT403' then null;
  end;
end
$$;
