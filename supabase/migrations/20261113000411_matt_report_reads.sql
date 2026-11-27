-- All report counts and drill-downs originate from the same scoped cohort.
create function saais_private.matt_report_payload(
  p_kind text, p_target uuid, p_department uuid, p_faculty uuid, p_program uuid, p_term uuid
) returns jsonb language sql stable set search_path = pg_catalog as $$
  with cohort as materialized (
    select s.id as student_id, left(s.student_number, 64) as student_number, left(s.full_name, 150) as full_name,
      s.entry_year, d.id as department_id, d.name as department_name, p.id as program_id,
      left(p.code, 100) as program_code, v.id as curriculum_version_id, left(v.version_label, 100) as curriculum_label,
      v.status as curriculum_status, a.adviser_id, left(ap.full_name, 150) as adviser_name
    from public.profile s
    join public.student_curriculum_assignment ca on ca.student_id = s.id and ca.end_date is null
    join public.curriculum_version v on v.id = ca.curriculum_version_id
    join public.program p on p.id = v.program_id
    join public.department d on d.id = p.department_id
    left join public.adviser_assignment a on a.student_id = s.id
      and daterange(a.start_date, a.end_date, '[)') @> (statement_timestamp() at time zone 'Asia/Manila')::date
    left join public.profile ap on ap.id = a.adviser_id
    where s.status in ('active', 'invited')
      and exists (select 1 from public.role_assignment r where r.profile_id = s.id and r.role = 'student')
      and (p_department is null or d.id = p_department)
      and (p_faculty is null or d.faculty_id = p_faculty)
      and (p_program is null or p.id = p_program)
      and (p_kind <> 'adviser_dashboard' or (
        a.adviser_id = p_target and (
          saais_private.has_role('admin')
          or (p_target = auth.uid() and saais_private.has_role('adviser'))
          or saais_private.has_role('department_head', d.id)
          or saais_private.has_role('dean', null, d.faculty_id)
        )
      ))
  ), summaries as materialized (
    select c.*, saais_private.matt_student_summary(c.student_id, c.curriculum_version_id, c.department_id, p_term) as summary
    from cohort c
  ), students as materialized (
    select s.*, (summary->>'gwa')::numeric as gwa, (summary->>'year_level')::integer as year_level,
      summary->>'standing' as standing, (
        jsonb_array_length(summary->'deficiencies') > 0 or (summary->>'open_flags_count')::integer > 0
      ) as at_risk,
      (summary->>'open_inc_count')::integer as open_inc_count, (summary->>'lapsed_inc_count')::integer as lapsed_inc_count,
      (summary->>'open_flags_count')::integer as open_flags_count
    from summaries s
  ), attempts as materialized (
    select e.*, a.inc_deadline
    from cohort c cross join lateral saais_private.matt_effective_attempts(c.student_id) e
    join public.attempt a on a.id = e.attempt_id
    where p_term is null or e.school_term_id = p_term
  ), grade_counts as (
    select count(*) as total, count(*) filter (where gwa_grade is not null) as graded,
      count(*) filter (where effective_status = 'inc' and not is_lapsed_inc) as inc,
      count(*) filter (where effective_status = 'dr') as dr,
      count(*) filter (where effective_status = 'na') as na,
      count(*) filter (where effective_status = 'currently_enrolled') as currently_enrolled
    from attempts
  ), grades as (
    select jsonb_build_object(
      'total_graded', graded, 'inc_count', inc, 'dr_count', dr, 'na_count', na,
      'currently_enrolled_count', currently_enrolled,
      'buckets', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'label', to_char(grade, 'FM9.00'), 'min_grade', grade, 'max_grade', grade,
          'count', n, 'percentage', round(100.0 * n / nullif(gc.graded, 0), 2)
        ) order by grade), '[]')
        from (select gwa_grade as grade, count(*) as n from attempts where gwa_grade is not null group by gwa_grade) b
      )
    ) as distribution,
    coalesce(round(100.0 * (total - currently_enrolled) / nullif(total, 0), 2), 0) as encoding_pct
    from grade_counts gc
  ), totals as (
    select count(*) as n, round(avg(gwa), 2) as mean_gwa, count(*) filter (where at_risk) as risk,
      count(*) filter (where adviser_id is null) as unassigned,
      coalesce(sum(open_inc_count), 0) as open_inc, coalesce(sum(lapsed_inc_count), 0) as lapsed_inc,
      coalesce(sum(open_flags_count), 0) as open_flags,
      jsonb_build_object(
        'good_standing', count(*) filter (where standing = 'good_standing'),
        'warning', count(*) filter (where standing = 'warning'),
        'probation', count(*) filter (where standing = 'probation'),
        'dismissed', count(*) filter (where standing = 'dismissed')
      ) as standing_counts
    from students
  ), years as (
    select coalesce(jsonb_agg(jsonb_build_object('year_level', year_level, 'student_count', n) order by year_level), '[]') as value
    from (select year_level, count(*) as n from students group by year_level) y
  ), batches as (
    select coalesce(jsonb_agg(to_jsonb(b) order by entry_year desc, program_code, curriculum_version_id), '[]') as value
    from (
      select entry_year, program_id, program_code, curriculum_version_id, curriculum_label, count(*) as student_count,
        round(avg(gwa), 2) as mean_gwa, count(*) filter (where standing = 'good_standing') as good_standing_count,
        count(*) filter (where at_risk) as at_risk_count
      from students where entry_year is not null
      group by entry_year, program_id, program_code, curriculum_version_id, curriculum_label
      order by entry_year desc, program_code, curriculum_version_id limit 500
    ) b
  ), risk_roster as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'student_id', student_id, 'student_number', student_number, 'full_name', full_name,
      'program_code', program_code, 'curriculum_label', curriculum_label, 'year_level', year_level,
      'adviser_id', adviser_id, 'adviser_name', adviser_name, 'gwa', gwa, 'standing', standing,
      'failed_units', summary->'failed_units', 'open_inc_count', open_inc_count, 'lapsed_inc_count', lapsed_inc_count,
      'open_flags_count', open_flags_count, 'deficiencies', (
        select jsonb_path_query_array(
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'kind', 'open_flag', 'attempt_id', f.attempt_id, 'course_code', c.code, 'course_title', c.title
            ) order by f.created_at desc, f.id)
            from public.grade_flag f
            join public.attempt a on a.id = f.attempt_id
            join public.course_offering o on o.id = a.course_offering_id
            join public.course c on c.id = o.course_id
            where f.student_id = s.student_id and f.status = 'open'
          ), '[]') || (summary->'deficiencies'), '$[0 to 99]'
        )
      )
    ) order by full_name, student_id), '[]') as value
    from (select * from students where at_risk order by full_name, student_id limit 500) s
  ), caseloads as (
    select coalesce(jsonb_agg(to_jsonb(c) order by adviser_name, adviser_id), '[]') as value
    from (
      select adviser_id, adviser_name, count(*) as student_count, count(*) filter (where at_risk) as at_risk_count
      from students where adviser_id is not null
      group by adviser_id, adviser_name order by adviser_name, adviser_id limit 500
    ) c
  ), curricula as (
    select coalesce(jsonb_agg(to_jsonb(c) order by program_code, version_label, curriculum_version_id), '[]') as value
    from (
      select curriculum_version_id, program_code, curriculum_label as version_label, curriculum_status as status,
        count(*) as student_count, round(avg(gwa), 2) as average_gwa, count(*) filter (where at_risk) as at_risk_count
      from students group by curriculum_version_id, program_code, curriculum_label, curriculum_status
      order by program_code, version_label, curriculum_version_id limit 200
    ) c
  ), bottlenecks as (
    select coalesce(jsonb_agg(to_jsonb(b) order by fail_or_inc_rate desc, affected_count desc, code, course_id), '[]') as value
    from (
      select c.id as course_id, c.code, c.title,
        round(100.0 * count(*) filter (where effective_status in ('failed', 'inc')) / count(*), 2) as fail_or_inc_rate,
        count(*) filter (where effective_status in ('failed', 'inc')) as affected_count
      from attempts a join public.course c on c.id = a.course_id
      where a.effective_status in ('passed', 'failed', 'inc')
      group by c.id, c.code, c.title
      having count(*) filter (where effective_status in ('failed', 'inc')) > 0
      order by fail_or_inc_rate desc, affected_count desc, code, course_id limit 200
    ) b
  ), departments as (
    select coalesce(jsonb_agg(to_jsonb(d) order by department_name, department_id), '[]') as value
    from (
      select d.id as department_id, d.name as department_name, count(s.student_id) as student_count,
        round(avg(s.gwa), 2) as average_gwa, count(s.student_id) filter (where s.at_risk) as at_risk_count
      from public.department d left join students s on s.department_id = d.id
      where p_kind = 'faculty' and d.faculty_id = p_faculty and (p_department is null or d.id = p_department)
      group by d.id, d.name order by d.name, d.id limit 100
    ) d
  )
  select jsonb_build_object(
    'standing_counts', t.standing_counts, 'grade_distribution', g.distribution,
    'batch_curriculum_gwa', batches.value, 'computed_at', statement_timestamp()
  ) || case p_kind
    when 'adviser_dashboard' then jsonb_build_object(
      'adviser_id', p_target, 'total_advisees', t.n, 'open_grade_flags_count', t.open_flags,
      'pending_inc_count', t.open_inc, 'lapsed_inc_count', t.lapsed_inc,
      'expiring_inc_soon_count', (select count(*) from public.attempt a join cohort c on c.student_id = a.student_id
        where a.status = 'inc' and a.inc_deadline - (statement_timestamp() at time zone 'Asia/Manila')::date between 0 and 30
        and not exists (select 1 from public.inc_resolution i where i.attempt_id = a.id)),
      'mean_gwa', t.mean_gwa, 'year_level_counts', years.value, 'advisees_with_deficiencies', risk_roster.value
    )
    when 'department' then jsonb_build_object(
      'department_id', p_department, 'total_students', t.n, 'with_deficiencies_count', t.risk,
      'unassigned_students_count', t.unassigned, 'open_grade_flags_count', t.open_flags,
      'pending_transfers_count', (select count(*) from public.curriculum_transfer_request x
        join cohort c on c.student_id = x.student_id where x.status = 'pending'),
      'encoding_progress_pct', g.encoding_pct, 'average_gwa', t.mean_gwa, 'year_level_counts', years.value,
      'adviser_caseloads', caseloads.value, 'curriculum_summaries', curricula.value,
      'bottleneck_courses', bottlenecks.value, 'at_risk_roster', risk_roster.value
    )
    when 'faculty' then jsonb_build_object(
      'faculty_id', p_faculty, 'total_students', t.n, 'with_deficiencies_count', t.risk, 'average_gwa', t.mean_gwa,
      'open_inc_count', t.open_inc, 'at_risk_total_count', t.risk, 'encoding_progress_pct', g.encoding_pct,
      'department_summaries', departments.value, 'at_risk_roster', risk_roster.value
    )
  end
  from totals t cross join grades g cross join years cross join batches cross join risk_roster
  cross join caseloads cross join curricula cross join bottlenecks cross join departments;
$$;

create function saais_private.matt_report_term(p_term uuid) returns uuid
language plpgsql stable set search_path = pg_catalog as $$
begin
  if p_term is not null and not exists (select 1 from public.school_term t where t.id = p_term) then
    perform saais_private.fail(400, 'Invalid report school term.');
  end if;
  return p_term;
end
$$;

create function saais_private.matt_getadviserdashboardreport(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  adviser uuid := coalesce((p_params->>'adviser_id')::uuid, auth.uid());
  term uuid := saais_private.matt_report_term((p_params->>'school_term_id')::uuid);
begin
  if not (saais_private.has_role('admin') or saais_private.has_role('department_head') or saais_private.has_role('dean'))
    and (adviser <> auth.uid() or not saais_private.has_role('adviser')) then
    perform saais_private.fail(403, 'The adviser report is outside your authorized scope.');
  end if;
  if p_params->>'adviser_id' is null and not saais_private.has_role('adviser') then
    perform saais_private.fail(400, 'Specify the adviser for the report.');
  end if;
  if not (
    saais_private.has_role('admin') or (adviser = auth.uid() and saais_private.has_role('adviser'))
    or exists (
      select 1 from public.role_assignment r
      where r.profile_id = adviser and r.role = 'adviser' and (
        (r.department_id is not null and saais_private.has_role('department_head', r.department_id))
        or (r.faculty_id is not null and saais_private.has_role('dean', null, r.faculty_id))
      )
    )
    or exists (
      select 1 from public.adviser_assignment a
      join public.student_curriculum_assignment ca on ca.student_id = a.student_id and ca.end_date is null
      join public.curriculum_version v on v.id = ca.curriculum_version_id
      join public.program p on p.id = v.program_id
      join public.department d on d.id = p.department_id
      where a.adviser_id = adviser
        and daterange(a.start_date, a.end_date, '[)') @> (statement_timestamp() at time zone 'Asia/Manila')::date
        and (saais_private.has_role('department_head', d.id) or saais_private.has_role('dean', null, d.faculty_id))
    )
  ) then
    perform saais_private.fail(403, 'The adviser report is outside your authorized scope.');
  end if;
  return saais_private.matt_report_payload('adviser_dashboard', adviser, null, null, null, term);
end
$$;

create function saais_private.matt_getdepartmentreport(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  department uuid := (p_params->>'department_id')::uuid;
  program uuid := (p_params->>'program_id')::uuid;
  term uuid := saais_private.matt_report_term((p_params->>'school_term_id')::uuid);
  program_department uuid;
begin
  if program is not null then
    select p.department_id into program_department from public.program p where p.id = program;
    if not found or (department is not null and department <> program_department) then
      perform saais_private.fail(400, 'Report program does not match the department scope.');
    end if;
  end if;
  department := saais_private.matt_settings_department(coalesce(department, program_department));
  if department is null then perform saais_private.fail(400, 'Specify the department for the report.'); end if;
  return saais_private.matt_report_payload('department', department, department, null, program, term);
end
$$;

create function saais_private.matt_getfacultyreport(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  faculty uuid := (p_params->>'faculty_id')::uuid;
  department uuid := (p_params->>'department_id')::uuid;
  term uuid := saais_private.matt_report_term((p_params->>'school_term_id')::uuid);
  department_faculty uuid;
  choices integer;
begin
  if department is not null then
    select d.faculty_id into department_faculty from public.department d where d.id = department;
    if not found or (faculty is not null and faculty <> department_faculty) then
      perform saais_private.fail(400, 'Report department does not match the faculty scope.');
    end if;
    faculty := department_faculty;
  end if;
  if faculty is null and not saais_private.has_role('admin') then
    select count(distinct r.faculty_id), (array_agg(distinct r.faculty_id))[1] into choices, faculty
    from public.role_assignment r where r.profile_id = auth.uid() and r.role = 'dean';
    if choices <> 1 then perform saais_private.fail(400, 'Specify one of your assigned faculties.'); end if;
  end if;
  if faculty is null or not exists (select 1 from public.faculty f where f.id = faculty) then
    perform saais_private.fail(400, 'Specify a valid report faculty.');
  end if;
  perform saais_private.require_scope(array['admin', 'dean'], null, faculty);
  return saais_private.matt_report_payload('faculty', faculty, department, faculty, null, term);
end
$$;

revoke all on function saais_private.matt_report_payload(text, uuid, uuid, uuid, uuid, uuid),
  saais_private.matt_report_term(uuid),
  saais_private.matt_getadviserdashboardreport(jsonb, jsonb),
  saais_private.matt_getdepartmentreport(jsonb, jsonb),
  saais_private.matt_getfacultyreport(jsonb, jsonb)
  from public, anon, authenticated;
