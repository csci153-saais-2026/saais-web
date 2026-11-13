-- Settings and audit writes use the authenticated actor and live role assignments
-- established by the shared Matt operation RPC.
create function saais_private.matt_settings_department(p_department uuid) returns uuid
language plpgsql set search_path = pg_catalog, public as $$
declare
  department uuid := p_department;
  choices integer;
begin
  if department is null and not saais_private.has_role('admin') then
    select count(distinct r.department_id), (array_agg(distinct r.department_id))[1]
      into choices, department
      from public.role_assignment r
      where r.profile_id = auth.uid() and r.role = 'department_head';
    if choices <> 1 then
      perform saais_private.fail(400, 'Specify one of your assigned departments.');
    end if;
  end if;
  perform saais_private.require_scope(array['admin', 'department_head'], department);
  if department is not null and not exists (select 1 from public.department d where d.id = department) then
    perform saais_private.fail(400, 'Invalid department scope.');
  end if;
  return department;
end
$$;

create function saais_private.matt_updatesystemsettings(p_params jsonb, p_body jsonb) returns jsonb
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
  if not (warning > 0 and warning < probation and probation < dismissal and dismissal <= 100)
    or warning <> trunc(warning) or probation <> trunc(probation) or dismissal <> trunc(dismissal) then
    perform saais_private.fail(400, 'Whole-number thresholds must satisfy 0 < warning_pct < probation_pct < dismissal_pct <= 100.');
  end if;
  if sender !~* '^[^[:space:]@]+@vsu[.]edu[.]ph$' or length(sender) > 254 then
    perform saais_private.fail(400, 'Use a valid @vsu.edu.ph sender email address.');
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

create function saais_private.matt_recordcompletedbackup(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  department uuid := saais_private.matt_settings_department((p_body->>'department_id')::uuid);
  scope text := coalesce(p_body->>'scope', case when department is null then 'institution_wide' else 'department_records' end);
  recorded_at timestamptz := clock_timestamp();
  completed_at timestamptz := coalesce((p_body->>'completed_at')::timestamptz, recorded_at);
  previous public.system_settings;
  saved public.system_settings;
begin
  if scope = 'institution_wide' and not saais_private.has_role('admin') then
    perform saais_private.fail(403, 'Only an administrator may record an institution-wide backup.');
  end if;
  if (scope = 'institution_wide') <> (department is null) then
    perform saais_private.fail(400, 'Backup scope must match the target department or institution.');
  end if;
  if completed_at > recorded_at then
    perform saais_private.fail(400, 'A completed backup must have a completion time in the past.');
  end if;
  select s.* into previous
    from public.system_settings s where s.department_id is not distinct from department for update;
  if previous.id is null then
    perform saais_private.fail(400, 'Configure settings for this scope before recording a backup.');
  end if;
  if previous.last_backup_at is not null and completed_at < previous.last_backup_at then
    perform saais_private.fail(400, 'The completion time is older than the last recorded backup.');
  end if;
  update public.system_settings
    set last_backup_at = completed_at, last_backup_by = auth.uid(),
      last_backup_reference = p_body->>'backup_reference', last_backup_location = p_body->>'storage_location',
      last_backup_scope = scope, updated_at = recorded_at
    where id = previous.id returning * into saved;
  insert into public.audit_log_entry(actor_id, actor_name, actor_role, action, action_category,
    entity_type, entity_id, old_value, new_value, reason, created_at)
  select p.id, left(p.full_name, 150), current_setting('saais.authorized_role')::public.role_type,
    'backup_completed', 'change', 'system_settings', saved.id,
    to_jsonb(previous), to_jsonb(saved), p_body->>'backup_label', recorded_at
  from public.profile p where p.id = auth.uid();
  return to_jsonb(saved);
end
$$;

create function saais_private.matt_recordauditviewevent(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  actor uuid := auth.uid();
  student uuid := (p_body->>'student_id')::uuid;
  action text := p_body->>'event_type';
  report text := p_body->>'report_type';
  filters jsonb := jsonb_strip_nulls(coalesce(nullif(p_body->'report_filters', 'null'), '{}'));
  department uuid := (filters->>'department_id')::uuid;
  faculty uuid := (filters->>'faculty_id')::uuid;
  program uuid := (filters->>'program_id')::uuid;
  term uuid := (filters->>'school_term_id')::uuid;
  entity uuid;
  filter_department uuid;
  filter_faculty uuid;
  audited_role text;
  student_name text;
  student_number text;
  target_label text;
  details text := p_body->>'details';
  category text;
  choices integer;
  entry public.audit_log_entry;
begin
  if action is null or action not in ('student_record_viewed', 'report_viewed', 'pdf_exported', 'csv_exported', 'report_exported')
    or num_nonnulls(student, report) <> 1
    or (action = 'student_record_viewed' and student is null)
    or (action in ('report_viewed', 'report_exported') and report is null)
    or (student is not null and filters <> '{}') then
    perform saais_private.fail(400, 'Specify one student or report target that matches the audit event.');
  end if;

  if student is not null then
    -- A missing, unprovisioned or unauthorized record is the same 403
    -- response here. This append-only endpoint does not disclose existence.
    select p.full_name, p.student_number, d.id, d.faculty_id
      into student_name, student_number, department, faculty
      from public.profile p
      join public.student_curriculum_assignment a on a.student_id = p.id and a.end_date is null
      join public.curriculum_version v on v.id = a.curriculum_version_id
      join public.program pg on pg.id = v.program_id
      join public.department d on d.id = pg.department_id
      where p.id = student and p.status <> 'disabled' and exists (
        select 1 from public.role_assignment r where r.profile_id = student and r.role = 'student'
      )
      for share of a;
    if not found then perform saais_private.fail(403, 'Student record is outside your authorized scope.'); end if;

    if student = actor and saais_private.has_role('student') then
      audited_role := 'student';
    elsif saais_private.has_role('adviser') and exists (
      select 1 from public.adviser_assignment a where a.student_id = student and a.adviser_id = actor
        and a.start_date <= (statement_timestamp() at time zone 'Asia/Manila')::date
    ) then
      audited_role := 'adviser';
    else
      perform saais_private.require_scope(array['admin', 'department_head', 'department_staff', 'dean'], department, faculty);
      audited_role := current_setting('saais.authorized_role');
    end if;
    entity := student;
    target_label := left(student_number || ' · ' || student_name, 250);
  else
    if program is not null then
      select p.department_id into filter_department from public.program p where p.id = program;
      if not found or (department is not null and department <> filter_department) then
        perform saais_private.fail(400, 'Report program does not match the department scope.');
      end if;
      department := filter_department;
    end if;
    if department is not null then
      select d.faculty_id into filter_faculty from public.department d where d.id = department;
      if not found or (faculty is not null and faculty <> filter_faculty) then
        perform saais_private.fail(400, 'Report department does not match the faculty scope.');
      end if;
      faculty := filter_faculty;
    end if;
    if faculty is not null and not exists (select 1 from public.faculty f where f.id = faculty) then
      perform saais_private.fail(400, 'Invalid report faculty.');
    end if;
    if term is not null and not exists (select 1 from public.school_term t where t.id = term) then
      perform saais_private.fail(400, 'Invalid report school term.');
    end if;

    case report
      when 'department' then
        if department is null and not saais_private.has_role('admin') then
          select count(distinct r.department_id), (array_agg(distinct r.department_id))[1]
            into choices, department from public.role_assignment r
            join public.department d on d.id = r.department_id
            where r.profile_id = actor and r.role = 'department_head' and (faculty is null or d.faculty_id = faculty);
          if choices <> 1 then perform saais_private.fail(403, 'Specify an authorized report department.'); end if;
        end if;
        if department is null then perform saais_private.fail(400, 'Specify a report department.'); end if;
        perform saais_private.require_scope(array['admin', 'department_head'], department);
        select d.faculty_id into faculty from public.department d where d.id = department;
        entity := department;
      when 'faculty' then
        if faculty is null and not saais_private.has_role('admin') then
          select count(distinct r.faculty_id), (array_agg(distinct r.faculty_id))[1]
            into choices, faculty from public.role_assignment r where r.profile_id = actor and r.role = 'dean';
          if choices <> 1 then perform saais_private.fail(403, 'Specify an authorized report faculty.'); end if;
        end if;
        if faculty is null then perform saais_private.fail(400, 'Specify a report faculty.'); end if;
        perform saais_private.require_scope(array['admin', 'dean'], null, faculty);
        entity := faculty;
      when 'institution' then
        perform saais_private.require_scope(array['admin']);
      when 'adviser_dashboard' then
        if saais_private.has_role('admin') then
          perform saais_private.require_scope(array['admin']);
        elsif (department is not null and saais_private.has_role('department_head', department))
          or (faculty is not null and saais_private.has_role('dean', null, faculty)) then
          perform saais_private.require_scope(
            case when department is null then array['dean'] else array['department_head', 'dean'] end,
            department, faculty
          );
        elsif department is null and faculty is null and saais_private.has_role('adviser') then
          perform saais_private.require_scope(array['adviser']);
          entity := actor;
        else
          perform saais_private.fail(403, 'Report is outside your authorized scope.');
        end if;
    end case;
    audited_role := current_setting('saais.authorized_role');
    entity := coalesce(entity, department, faculty);
    target_label := initcap(replace(report, '_', ' '));
  end if;

  category := case
    when action in ('pdf_exported', 'csv_exported', 'report_exported') then 'export'
    when student is not null then 'record_view'
    else 'view'
  end;
  insert into public.audit_log_entry(
    actor_id, actor_name, actor_role, student_id, action, action_category, entity_type, entity_id, new_value, reason, created_at
  )
  select actor, left(p.full_name, 150), audited_role::public.role_type, student, action, category,
    coalesce(report, 'student_record'), entity,
    case when report is not null then jsonb_strip_nulls(jsonb_build_object(
      'school_term_id', term, 'faculty_id', faculty, 'department_id', department, 'program_id', program
    )) end,
    details, clock_timestamp()
  from public.profile p where p.id = actor returning * into entry;
  return to_jsonb(entry) || jsonb_build_object(
    'student_name', left(student_name, 150), 'student_number', left(student_number, 64),
    'target_label', target_label, 'details_summary', coalesce(details, target_label)
  );
end
$$;

revoke all on function saais_private.matt_settings_department(uuid),
  saais_private.matt_updatesystemsettings(jsonb, jsonb),
  saais_private.matt_recordcompletedbackup(jsonb, jsonb),
  saais_private.matt_recordauditviewevent(jsonb, jsonb)
  from public, anon, authenticated;
