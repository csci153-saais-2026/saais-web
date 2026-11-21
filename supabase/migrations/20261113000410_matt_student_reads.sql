create function saais_private.matt_read_student(p_student_id uuid) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  caller uuid := saais_private.actor();
  org jsonb;
  department uuid;
  faculty uuid;
begin
  if not exists (
    select 1 from public.role_assignment r where r.profile_id = p_student_id and r.role = 'student'
  ) then
    perform saais_private.fail(404, 'Student not found.');
  end if;
  org := saais_private.organization(p_student_id);
  department := (org->>'department_id')::uuid;
  faculty := (org->>'faculty_id')::uuid;
  if not (
    saais_private.has_role('admin')
    or (caller = p_student_id and saais_private.has_role('student'))
    or (department is not null and (
      saais_private.has_role('department_head', department)
      or saais_private.has_role('department_staff', department)
      or saais_private.has_role('dean', null, faculty)
    ))
    or (saais_private.has_role('adviser') and exists (
      select 1 from public.adviser_assignment a
      where a.student_id = p_student_id and a.adviser_id = caller
        and a.start_date <= (now() at time zone 'Asia/Manila')::date
    ))
  ) then
    perform saais_private.fail(403, 'This student is outside your authorized scope.');
  end if;
  if org is null then
    perform saais_private.fail(409, 'Student has no current curriculum assignment.');
  end if;
  return org;
end;
$$;

-- Each slot has at most one live source. The source unit snapshot, not the
-- nominal slot units, is credited. The original attempt remains independent.
create function saais_private.matt_checklist_slots(p_student_id uuid, p_curriculum_id uuid)
returns table (
  slot_id uuid, year_level integer, term_sequence integer, status text,
  required_units numeric, earned_units numeric, source_attempt_id uuid,
  satisfaction_source text, credited_course_code text, credited_course_title text
)
language sql stable set search_path = pg_catalog as $$
  with effective as materialized (
    select * from saais_private.matt_effective_attempts(p_student_id)
  ), live_credit as (
    select e.curriculum_term_course_id as slot_id, a.attempt_id, e.units_credited as units,
      'Elective mapping' as source, c.code, c.title
    from public.elective_mapping e join effective a on a.attempt_id = e.attempt_id
    join public.course c on c.id = a.course_id
    where e.student_id = p_student_id and e.revoked_at is null and a.effective_status = 'passed'
    union all
    select e.destination_curriculum_term_course_id, a.attempt_id, e.units_credited,
      case e.decision_type when 'transfer_equivalency' then 'Transfer equivalency' else 'Discontinued equivalency' end,
      c.code, c.title
    from public.equivalency_decision e join effective a on a.attempt_id = e.attempt_id
    join public.course c on c.id = a.course_id
    where e.student_id = p_student_id and e.revoked_at is null and a.effective_status = 'passed'
    union all
    select e.destination_curriculum_term_course_id, null, e.units_credited,
      'Outside credit', e.original_course_code, e.original_course_title
    from public.outside_credit e where e.student_id = p_student_id and e.revoked_at is null
  )
  select s.id, t.year_level, t.term_sequence,
    case when credit.source is not null then 'passed' else coalesce(a.effective_status, 'not_taken') end,
    s.nominal_units,
    coalesce(credit.units, case when a.effective_status = 'passed' then a.units_attempted end, 0),
    case when credit.source is not null then credit.attempt_id else a.attempt_id end,
    coalesce(credit.source, case when a.effective_status = 'passed' then 'Direct' end),
    coalesce(credit.code, case when a.effective_status = 'passed' then c.code end),
    coalesce(credit.title, case when a.effective_status = 'passed' then c.title end)
  from public.curriculum_term_course s join public.curriculum_term t on t.id = s.curriculum_term_id
  left join live_credit credit on credit.slot_id = s.id
  left join lateral (
    select a.* from effective a
    where a.curriculum_term_course_id = s.id
      and (a.effective_status <> 'passed' or a.counts_toward_cumulative_gwa)
      and not exists (select 1 from live_credit l where l.attempt_id = a.attempt_id)
    order by (a.effective_status = 'passed') desc, a.chronological_key desc, a.attempt_id
    limit 1
  ) a on true
  left join public.course c on c.id = a.course_id
  where t.curriculum_version_id = p_curriculum_id;
$$;

create function saais_private.matt_getchecklist(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  student uuid := (p_params->>'student_id')::uuid;
  org jsonb := saais_private.matt_read_student(student);
begin
  return (
    with slots as (
      select * from saais_private.matt_checklist_slots(student, (org->>'curriculum_version_id')::uuid)
      order by year_level, term_sequence, slot_id
      limit coalesce((p_params->>'limit')::int, 20) offset coalesce((p_params->>'offset')::int, 0)
    ), effective as materialized (
      select * from saais_private.matt_effective_attempts(student)
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'curriculum_term_course_id', s.slot_id, 'status', s.status,
      'required_units', s.required_units, 'earned_units', s.earned_units,
      'source_attempt_id', s.source_attempt_id, 'satisfaction_source', s.satisfaction_source,
      'credited_course_code', s.credited_course_code, 'credited_course_title', s.credited_course_title,
      'attempts', coalesce(history.attempts, '[]'::jsonb),
      'grade_fix_history', coalesce(history.grade_fixes, '[]'::jsonb)
    ) order by s.year_level, s.term_sequence, s.slot_id), '[]'::jsonb)
    from slots s
    left join lateral (
      with matches as materialized (
        select a.*, original.midterm_status, original.midterm_grade, original.final_grade,
          original.inc_deadline, original.instructor
        from effective a join public.attempt original on original.id = a.attempt_id
        where a.curriculum_term_course_id = s.slot_id or a.attempt_id = s.source_attempt_id
        order by a.chronological_key desc, a.attempt_id limit 50
      )
      select jsonb_agg(jsonb_build_object(
        'attempt_id', a.attempt_id, 'school_term_id', a.school_term_id, 'term_label', a.term_label,
        'midterm_status', a.midterm_status, 'midterm_grade', a.midterm_grade, 'final_grade', a.final_grade,
        'recorded_status', a.recorded_status, 'completion_grade', a.completion_grade,
        'effective_status', a.effective_status, 'inc_deadline', a.inc_deadline, 'instructor', a.instructor
      ) order by a.chronological_key desc, a.attempt_id) as attempts, (
        select jsonb_agg(h.entry order by h.entry->>'changed_at' desc) from (
          select entry from matches m
          cross join lateral jsonb_array_elements(saais_private.matt_grade_fix_history(m.attempt_id)) as entry
          order by entry->>'changed_at' desc, m.attempt_id limit 50
        ) h
      ) as grade_fixes
      from matches a
    ) history on true
  );
end;
$$;

create function saais_private.matt_gettermgrades(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  student uuid := (p_params->>'student_id')::uuid;
begin
  perform saais_private.matt_read_student(student);
  return (
    with effective as materialized (
      select * from saais_private.matt_effective_attempts(student)
    ), terms as (
      select t.id, t.school_year, t.term_type, t.chronological_key,
        round(sum(a.gwa_grade * a.units_attempted) / nullif(sum(a.units_attempted) filter (where a.gwa_grade is not null), 0), 2) as gwa
      from effective a join public.school_term t on t.id = a.school_term_id
      group by t.id
      order by t.chronological_key desc, t.id
      limit coalesce((p_params->>'limit')::int, 20) offset coalesce((p_params->>'offset')::int, 0)
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'school_term_id', t.id, 'school_year', t.school_year, 'term_type', t.term_type,
      'chronological_key', t.chronological_key, 'gwa', t.gwa,
      'attempts', (
        select jsonb_agg(jsonb_build_object(
          'id', a.attempt_id, 'student_id', a.student_id, 'course_offering_id', a.course_offering_id,
          'curriculum_term_course_id', a.curriculum_term_course_id, 'recorded_status', a.recorded_status,
          'midterm_status', original.midterm_status, 'midterm_grade', original.midterm_grade,
          'final_grade', original.final_grade, 'inc_deadline', original.inc_deadline,
          'instructor', original.instructor, 'prerequisite_override', original.prerequisite_override,
          'prerequisite_grade_override', original.prerequisite_grade_override,
          'grade_fix_history', saais_private.matt_grade_fix_history(a.attempt_id),
          'units_attempted', a.units_attempted, 'revision', original.revision,
          'created_at', original.created_at, 'updated_at', original.updated_at,
          'completion_grade', a.completion_grade, 'resolved_at', a.resolved_at,
          'effective_status', a.effective_status, 'gwa_grade', a.gwa_grade,
          'is_lapsed_inc', a.is_lapsed_inc, 'is_repeated', a.is_repeated,
          'counts_toward_cumulative_gwa', a.counts_toward_cumulative_gwa
        ) order by c.code, a.attempt_id)
        from (
          select * from effective a where a.school_term_id = t.id order by a.course_id, a.attempt_id limit 1000
        ) a join public.attempt original on original.id = a.attempt_id
        join public.course c on c.id = a.course_id
      )
    ) order by t.chronological_key desc, t.id), '[]'::jsonb)
    from terms t
  );
end;
$$;

-- Enrollment context changes standing and failed units. Cumulative GWA and
-- live checklist credit remain cumulative regardless of the requested term.
create function saais_private.matt_student_summary(
  p_student_id uuid, p_curriculum_id uuid, p_department_id uuid, p_term_id uuid default null
) returns jsonb
language sql stable set search_path = pg_catalog as $$
  with effective as materialized (
    select a.*, original.inc_deadline, original.updated_at
    from saais_private.matt_effective_attempts(p_student_id) a
    join public.attempt original on original.id = a.attempt_id
  ), term as (
    select t.id, t.ends_on, t.chronological_key
    from public.school_term t
    where t.id = p_term_id or (
      p_term_id is null and exists(select 1 from effective a where a.school_term_id = t.id)
    )
    order by t.chronological_key desc, t.id limit 1
  ), flags as materialized (
    select f.attempt_id, max(f.updated_at) as updated_at, count(*) as count
    from public.grade_flag f where f.student_id = p_student_id and f.status = 'open'
    group by f.attempt_id
  ), attempts as (
    select round(sum(a.gwa_grade * a.units_attempted) filter (where a.counts_toward_cumulative_gwa)
      / nullif(sum(a.units_attempted) filter (where a.counts_toward_cumulative_gwa), 0), 2) as gwa,
      coalesce(sum(a.units_attempted) filter (where a.counts_toward_cumulative_gwa), 0) as counted_units,
      coalesce(sum(a.units_attempted) filter (where a.school_term_id = (select id from term)
        and (a.effective_status = 'failed' or a.is_lapsed_inc)), 0) as failed_units,
      coalesce(sum(a.units_attempted) filter (where a.school_term_id = (select id from term)), 0) as attempted_units,
      coalesce(sum(a.units_attempted) filter (where a.effective_status = 'currently_enrolled'), 0) as in_progress_units,
      count(*) filter (where a.effective_status = 'inc' and not a.is_lapsed_inc) as open_inc_count,
      count(*) filter (where a.is_lapsed_inc) as lapsed_inc_count,
      min(a.inc_deadline) filter (where a.effective_status = 'inc' and not a.is_lapsed_inc) as nearest_inc_deadline
    from effective a
  ), checklist as (
    select coalesce(sum(s.earned_units), 0) as earned_units,
      count(*) as total_slots, count(*) filter (where s.status = 'passed') as slots_satisfied,
      coalesce(max(s.year_level) filter (where s.status <> 'not_taken'), 1) as year_level
    from saais_private.matt_checklist_slots(p_student_id, p_curriculum_id) s
  ), deficiencies as materialized (
    select a.attempt_id, a.course_id, a.term_label, a.chronological_key, a.inc_deadline,
      case when a.is_lapsed_inc then 'lapsed_inc' when a.effective_status = 'inc' then 'open_inc'
        when a.effective_status = 'failed' then 'failed' else 'dr' end as kind
    from effective a
    where a.effective_status = 'inc'
      or (a.effective_status = 'failed' and a.counts_toward_cumulative_gwa)
      or (a.effective_status = 'dr' and not exists (
        select 1 from effective newer where newer.course_id = a.course_id
          and (newer.chronological_key > a.chronological_key or newer.effective_status = 'passed')
      ))
  ), policy as (
    select current_curriculum.total_units,
      coalesce(as_of_term.delinquency_threshold, current_curriculum.delinquency_threshold) as threshold,
      coalesce(department.warning_pct, institution.warning_pct) as warning,
      coalesce(department.probation_pct, institution.probation_pct) as probation,
      coalesce(department.dismissal_pct, institution.dismissal_pct) as dismissal
    from public.curriculum_version current_curriculum
    left join lateral (
      select v.delinquency_threshold from public.student_curriculum_assignment ca
      join public.curriculum_version v on v.id = ca.curriculum_version_id
      where ca.student_id = p_student_id and ca.start_date <= (select ends_on from term)
        and (ca.end_date is null or ca.end_date > (select ends_on from term))
      order by ca.start_date desc, ca.id limit 1
    ) as_of_term on true
    left join public.system_settings department on department.department_id = p_department_id
    left join public.system_settings institution on institution.department_id is null
    where current_curriculum.id = p_curriculum_id
  ), standing as (
    select a.*, coalesce(a.failed_units * 100 / nullif(a.attempted_units, 0), 0) as failure_pct
    from attempts a
  )
  select jsonb_build_object(
    'student_id', p_student_id, 'gwa', a.gwa, 'earned_units', c.earned_units,
    'required_units', p.total_units, 'counted_units', a.counted_units,
    'failed_units', a.failed_units, 'in_progress_units', a.in_progress_units,
    'remaining_units', greatest(p.total_units - c.earned_units, 0), 'failure_pct', round(a.failure_pct, 2),
    'standing', case when a.failed_units > 0 and a.failure_pct >= p.dismissal then 'dismissed'
      when a.failed_units > 0 and a.failure_pct >= p.probation then 'probation'
      when a.failed_units > 0 and a.failure_pct >= p.warning then 'warning'
      else 'good_standing' end,
    'year_level', c.year_level, 'slots_satisfied', c.slots_satisfied, 'total_slots', c.total_slots,
    'open_inc_count', a.open_inc_count, 'lapsed_inc_count', a.lapsed_inc_count,
    'open_flags_count', coalesce((select sum(f.count) from flags f), 0),
    'deficiencies_count', (select count(*) from deficiencies),
    'deficiencies', (
      select coalesce(jsonb_agg(items.item order by items.chronological_key desc, items.attempt_id), '[]'::jsonb) from (
        select d.chronological_key, d.attempt_id, jsonb_build_object(
          'kind', d.kind, 'attempt_id', d.attempt_id, 'course_code', c.code, 'course_title', c.title,
          'term_label', d.term_label, 'inc_deadline', d.inc_deadline,
          'days_remaining', d.inc_deadline - (now() at time zone 'Asia/Manila')::date
        ) as item
        from deficiencies d join public.course c on c.id = d.course_id
        where d.kind <> 'dr'
        order by d.chronological_key desc, d.attempt_id limit 200
      ) items
    ),
    'is_delinquent', p.threshold > 0 and a.failed_units >= p.threshold,
    'computed_at', now(),
    'nearest_inc_deadline', a.nearest_inc_deadline
  )
  from standing a cross join checklist c cross join policy p;
$$;

create function saais_private.matt_getacademicsummary(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  student uuid := (p_params->>'student_id')::uuid;
  org jsonb := saais_private.matt_read_student(student);
begin
  return saais_private.matt_student_summary(
    student, (org->>'curriculum_version_id')::uuid, (org->>'department_id')::uuid
  ) - 'nearest_inc_deadline';
end;
$$;

create function saais_private.matt_liststudentroster(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  caller uuid := saais_private.actor();
  today date := (now() at time zone 'Asia/Manila')::date;
  assignment_scope text := coalesce(p_params->>'assignment_scope', 'all');
  adviser_filter uuid := (p_params->>'adviser_id')::uuid;
  term_filter uuid := (p_params->>'school_term_id')::uuid;
  unassigned_only boolean := coalesce((p_params->>'unassigned_only')::boolean, false);
  search_text text := lower(btrim(coalesce(p_params->>'search', '')));
  sort_field text := coalesce(p_params->>'sort_by', 'full_name');
  sort_direction text := coalesce(p_params->>'sort_dir', 'asc');
begin
  if (unassigned_only and assignment_scope not in ('all','unassigned','past','my_handed_over_advisees'))
    or ((unassigned_only or assignment_scope = 'unassigned') and adviser_filter is not null)
  then
    perform saais_private.fail(400, 'Assignment filters contradict one another.');
  end if;
  if term_filter is not null and not exists(select 1 from public.school_term t where t.id = term_filter) then
    perform saais_private.fail(400, 'The school term filter does not exist.');
  end if;

  return (
    with caller_roles as materialized (
      select r.role, r.department_id, r.faculty_id
      from public.role_assignment r
      where r.profile_id = caller
    ), visible as materialized (
      select s.id, s.student_number, s.full_name, s.email, s.avatar_url, s.status, s.entry_year,
        f.id as faculty_id, f.name as faculty_name, d.id as department_id, d.name as department_name,
        p.id as program_id, p.code as program_code, p.name as program_name,
        v.id as curriculum_version_id, v.version_label as curriculum_label,
        a.adviser_id, adviser.full_name as adviser_name, a.start_date as adviser_assigned_since,
        case when historical.end_date is not null and a.adviser_id is distinct from caller then
          (saais_private.matt_adviser_assignment_payload(historical.id)->>'handover_label') end as handover_label,
        case when a.adviser_id = caller then 'active'
          when historical.end_date is not null then 'past'
          when a.adviser_id is null then 'unassigned' else 'active' end as assignment_status
      from public.profile s
      join public.role_assignment sr on sr.profile_id = s.id and sr.role = 'student'
      join public.student_curriculum_assignment ca on ca.student_id = s.id and ca.end_date is null
      join public.curriculum_version v on v.id = ca.curriculum_version_id
      join public.program p on p.id = v.program_id
      join public.department d on d.id = p.department_id
      join public.faculty f on f.id = d.faculty_id
      left join lateral (
        select aa.adviser_id, aa.start_date from public.adviser_assignment aa
        where aa.student_id = s.id and aa.start_date <= today and (aa.end_date is null or aa.end_date > today)
        order by aa.start_date desc, aa.id limit 1
      ) a on true
      left join public.profile adviser on adviser.id = a.adviser_id
      left join lateral (
        select aa.id, aa.end_date from public.adviser_assignment aa
        where aa.student_id = s.id and aa.adviser_id = caller and aa.end_date <= today
        order by aa.end_date desc, aa.id limit 1
      ) historical on true
      where exists (
        select 1 from caller_roles r where r.role = 'admin'
          or (r.role in ('department_head','department_staff') and r.department_id = d.id)
          or (r.role = 'dean' and r.faculty_id = f.id)
          or (r.role = 'adviser' and (a.adviser_id = caller or historical.id is not null))
      )
      and (not p_params ? 'faculty_id' or f.id = (p_params->>'faculty_id')::uuid)
      and (not p_params ? 'department_id' or d.id = (p_params->>'department_id')::uuid)
      and (not p_params ? 'program_id' or p.id = (p_params->>'program_id')::uuid)
      and (not p_params ? 'curriculum_version_id' or v.id = (p_params->>'curriculum_version_id')::uuid)
      and (not p_params ? 'entry_year' or s.entry_year = (p_params->>'entry_year')::integer)
      and (adviser_filter is null or a.adviser_id = adviser_filter)
      and (not unassigned_only or a.adviser_id is null)
      and case assignment_scope
        when 'current' then a.adviser_id = caller
        when 'my_active_advisees' then a.adviser_id = caller
        when 'past' then historical.id is not null and a.adviser_id is distinct from caller
        when 'my_handed_over_advisees' then historical.id is not null and a.adviser_id is distinct from caller
        when 'unassigned' then a.adviser_id is null
        else true end
      and (search_text = '' or strpos(lower(s.full_name), search_text) > 0
        or strpos(lower(s.student_number), search_text) > 0 or strpos(lower(s.email), search_text) > 0)
    ), academic as materialized (
      select v.*, saais_private.matt_student_summary(v.id, v.curriculum_version_id, v.department_id, term_filter) as summary,
        greatest(
          (select max(a.updated_at) from public.attempt a where a.student_id = v.id
            and (term_filter is null or exists (
              select 1 from public.course_offering o where o.id = a.course_offering_id and o.school_term_id = term_filter))),
          (select max(n.created_at) from public.advising_note n where n.student_id = v.id),
          (select c.updated_at from saais_private.cache_invalidation c where c.student_id = v.id and term_filter is null)
        ) as last_activity_at
      from visible v
    ), filtered as materialized (
      select a.*, (a.summary->>'year_level')::integer as year_level,
        (a.summary->>'gwa')::numeric as gwa, (a.summary->>'earned_units')::numeric as units_earned,
        a.summary->>'standing' as standing, (a.summary->>'open_flags_count')::bigint as open_flags_count,
        (a.summary->>'open_inc_count')::bigint as open_inc_count,
        (a.summary->>'deficiencies_count')::bigint as deficiencies_count
      from academic a
      where (not p_params ? 'year_level' or (a.summary->>'year_level')::integer = (p_params->>'year_level')::integer)
        and (not p_params ? 'standing' or a.summary->>'standing' = p_params->>'standing')
        and (not p_params ? 'has_open_flags' or ((a.summary->>'open_flags_count')::bigint > 0) = (p_params->>'has_open_flags')::boolean)
        and (not p_params ? 'has_open_inc' or ((a.summary->>'open_inc_count')::bigint > 0) = (p_params->>'has_open_inc')::boolean)
        and (not p_params ? 'has_deficiencies' or ((a.summary->>'deficiencies_count')::bigint > 0) = (p_params->>'has_deficiencies')::boolean)
    ), sortable as (
      select f.*,
        case sort_field when 'full_name' then lower(f.full_name) when 'student_number' then f.student_number end as sort_text,
        case sort_field when 'year_level' then f.year_level when 'gwa' then f.gwa when 'units_earned' then f.units_earned
          when 'standing' then array_position(array['good_standing','warning','probation','dismissed'], f.standing) end as sort_number,
        case sort_field when 'last_activity_at' then f.last_activity_at end as sort_time
      from filtered f
    ), ordered as (
      select s.*, row_number() over (order by
        case when sort_direction = 'asc' then sort_text end asc nulls last,
        case when sort_direction = 'desc' then sort_text end desc nulls last,
        case when sort_direction = 'asc' then sort_number end asc nulls last,
        case when sort_direction = 'desc' then sort_number end desc nulls last,
        case when sort_direction = 'asc' then sort_time end asc nulls last,
        case when sort_direction = 'desc' then sort_time end desc nulls last, id
      ) as row_no from sortable s
    ), page as (
      select * from ordered order by row_no
      limit coalesce((p_params->>'limit')::integer, 20) offset coalesce((p_params->>'offset')::integer, 0)
    )
    select jsonb_build_object(
      'total_count', count(*),
      'unassigned_count', count(*) filter (where f.adviser_id is null),
      'with_deficiencies_count', count(*) filter (where f.deficiencies_count > 0),
      'flagged_count', count(*) filter (where f.open_flags_count > 0 or (f.summary->>'is_delinquent')::boolean),
      'open_inc_students_count', count(*) filter (where f.open_inc_count > 0),
      'standing_counts', jsonb_build_object(
        'good_standing', count(*) filter (where f.standing = 'good_standing'),
        'warning', count(*) filter (where f.standing = 'warning'),
        'probation', count(*) filter (where f.standing = 'probation'),
        'dismissed', count(*) filter (where f.standing = 'dismissed')
      ),
      'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'student_id', p.id, 'student_number', p.student_number, 'full_name', p.full_name, 'email', p.email,
        'avatar_url', p.avatar_url, 'status', p.status,
        'faculty_id', p.faculty_id, 'faculty_name', p.faculty_name,
        'department_id', p.department_id, 'department_name', p.department_name,
        'program_id', p.program_id, 'program_code', p.program_code, 'program_name', p.program_name,
        'curriculum_version_id', p.curriculum_version_id, 'curriculum_label', p.curriculum_label, 'entry_year', p.entry_year,
        'year_level', p.year_level, 'gwa', p.gwa, 'earned_units', p.units_earned, 'required_units', p.summary->'required_units',
        'standing', p.standing, 'is_delinquent', p.summary->'is_delinquent',
        'deficiencies_count', p.deficiencies_count, 'open_inc_count', p.open_inc_count,
        'lapsed_inc_count', p.summary->'lapsed_inc_count', 'open_flags_count', p.open_flags_count,
        'nearest_inc_deadline', p.summary->'nearest_inc_deadline',
        'nearest_inc_days_remaining', (p.summary->>'nearest_inc_deadline')::date - today,
        'assignment_status', p.assignment_status, 'adviser_id', p.adviser_id, 'adviser_name', p.adviser_name,
        'adviser_assigned_since', p.adviser_assigned_since, 'handover_label', p.handover_label,
        'last_activity_at', p.last_activity_at
      ) order by p.row_no), '[]'::jsonb) from page p)
    )
    from filtered f
  );
end;
$$;

revoke all on function saais_private.matt_read_student(uuid), saais_private.matt_checklist_slots(uuid, uuid),
  saais_private.matt_student_summary(uuid, uuid, uuid, uuid), saais_private.matt_getchecklist(jsonb, jsonb),
  saais_private.matt_gettermgrades(jsonb, jsonb), saais_private.matt_getacademicsummary(jsonb, jsonb),
  saais_private.matt_liststudentroster(jsonb, jsonb) from public, anon, authenticated;
