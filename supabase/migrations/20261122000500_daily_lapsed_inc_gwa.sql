-- Keep effective term results separate from the one selected cumulative
-- contribution per course. A lapsed INC is worth 5.00 in its own term.
create function saais_private.matt_effective_attempts(p_student_id uuid, p_as_of date)
returns table (
  attempt_id uuid, student_id uuid, course_offering_id uuid, course_id uuid,
  curriculum_term_course_id uuid, school_term_id uuid, chronological_key integer, term_label text,
  recorded_status text, effective_status text, completion_grade numeric, resolved_at timestamptz,
  gwa_grade numeric, is_lapsed_inc boolean, is_repeated boolean, counts_toward_cumulative_gwa boolean,
  units_attempted numeric
)
language sql stable set search_path = pg_catalog as $$
  with recorded as (
    select a.id, a.student_id, a.course_offering_id, o.course_id, a.curriculum_term_course_id,
      t.id as school_term_id, t.chronological_key, t.school_year || ' ' || t.term_type as term_label,
      a.status::text as recorded_status,
      case when a.status = 'inc' and i.id is not null then i.effective_status::text else a.status::text end as effective_status,
      case when a.status = 'inc' then i.completion_grade end as completion_grade,
      case when a.status = 'inc' then i.resolved_at end as resolved_at,
      case when a.status = 'inc' then i.completion_grade else a.final_grade end as numeric_grade,
      a.status = 'inc' and i.id is null and a.inc_deadline < p_as_of as is_lapsed_inc,
      a.units_attempted
    from public.attempt a
    join public.course_offering o on o.id = a.course_offering_id
    join public.school_term t on t.id = o.school_term_id
    left join public.inc_resolution i on i.attempt_id = a.id
    where a.student_id = p_student_id
  ), ordered as (
    select recorded.*,
      min(chronological_key) filter (where effective_status = 'passed') over course as first_pass_term,
      max(chronological_key) filter (where numeric_grade is not null) over course as latest_numeric_term,
      first_value(id) over (
        partition by course_id
        order by case when effective_status = 'passed' then 1 when numeric_grade is not null then 2
                      when is_lapsed_inc then 3 else 4 end,
          case when effective_status = 'failed' then -chronological_key else chronological_key end,
          id
      ) as cumulative_id
    from recorded
    window course as (partition by course_id)
  )
  select id, student_id, course_offering_id, course_id, curriculum_term_course_id, school_term_id,
    chronological_key, term_label, recorded_status, effective_status, completion_grade, resolved_at,
    case when is_lapsed_inc then 5.00 else numeric_grade end,
    is_lapsed_inc,
    (effective_status = 'failed' or is_lapsed_inc)
      and (first_pass_term is null or chronological_key < first_pass_term)
      and coalesce(latest_numeric_term > chronological_key, false),
    id = cumulative_id and (numeric_grade is not null or is_lapsed_inc),
    units_attempted
  from ordered;
$$;

-- Keep effective term results separate from the one selected cumulative
-- contribution per course. A lapsed INC is worth 5.00 in its own term.
create or replace function saais_private.matt_effective_attempts(p_student_id uuid)
returns table (
  attempt_id uuid, student_id uuid, course_offering_id uuid, course_id uuid,
  curriculum_term_course_id uuid, school_term_id uuid, chronological_key integer, term_label text,
  recorded_status text, effective_status text, completion_grade numeric, resolved_at timestamptz,
  gwa_grade numeric, is_lapsed_inc boolean, is_repeated boolean, counts_toward_cumulative_gwa boolean,
  units_attempted numeric
)
language sql stable set search_path = pg_catalog as $$
  select * from saais_private.matt_effective_attempts(p_student_id, (now() at time zone 'Asia/Manila')::date);
$$;


create function saais_private.matt_student_summary(
  p_student_id uuid, p_curriculum_id uuid, p_department_id uuid, p_term_id uuid, p_as_of date
) returns jsonb
language sql stable set search_path = pg_catalog as $$
  with effective as materialized (
    select a.*, original.inc_deadline, original.updated_at
    from saais_private.matt_effective_attempts(p_student_id, p_as_of) a
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
          'days_remaining', d.inc_deadline - p_as_of
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

create or replace function saais_private.matt_student_summary(
  p_student_id uuid, p_curriculum_id uuid, p_department_id uuid, p_term_id uuid default null
) returns jsonb
language sql stable set search_path = pg_catalog as $$
  select saais_private.matt_student_summary(
    p_student_id, p_curriculum_id, p_department_id, p_term_id, (now() at time zone 'Asia/Manila')::date
  );
$$;


create table saais_private.lapsed_inc_recomputation (
  student_id uuid not null references public.profile(id),
  school_term_id uuid not null references public.school_term(id),
  as_of date not null,
  cumulative_gwa numeric,
  counted_units numeric not null,
  failed_units numeric not null,
  is_delinquent boolean not null,
  lapsed_inc_count integer not null,
  primary key (student_id, school_term_id)
);

create index attempt_unresolved_inc_candidates on public.attempt (inc_deadline, student_id)
  where status = 'inc';

create function saais_private.recompute_lapsed_inc_gwa(p_as_of date) returns integer
language plpgsql security definer set search_path = pg_catalog as $$
declare
  changed integer;
begin
  perform pg_advisory_xact_lock(531201, 2);
  with affected as (
    select a.student_id, o.school_term_id
    from public.attempt a
    join public.course_offering o on o.id = a.course_offering_id
    where a.status = 'inc' and a.inc_deadline < p_as_of
      and not exists (select 1 from public.inc_resolution i where i.attempt_id = a.id)
    union
    -- Refresh existing snapshots when a grade correction or completion removes a lapse.
    select r.student_id, r.school_term_id
    from saais_private.lapsed_inc_recomputation r
  ), summaries as materialized (
    select a.student_id, a.school_term_id, saais_private.matt_student_summary(
      a.student_id, (org.value->>'curriculum_version_id')::uuid,
      (org.value->>'department_id')::uuid, a.school_term_id, p_as_of
    ) as value
    from affected a
    cross join lateral (select saais_private.organization(a.student_id) as value) org
    where org.value is not null
  ), updates as (
    insert into saais_private.lapsed_inc_recomputation as previous (
      student_id, school_term_id, as_of, cumulative_gwa, counted_units,
      failed_units, is_delinquent, lapsed_inc_count
    )
    select s.student_id, s.school_term_id, p_as_of, (s.value->>'gwa')::numeric,
      (s.value->>'counted_units')::numeric, (s.value->>'failed_units')::numeric,
      (s.value->>'is_delinquent')::boolean, (s.value->>'lapsed_inc_count')::integer
    from summaries s
    on conflict (student_id, school_term_id) do update
      set as_of = excluded.as_of, cumulative_gwa = excluded.cumulative_gwa,
        counted_units = excluded.counted_units, failed_units = excluded.failed_units,
        is_delinquent = excluded.is_delinquent, lapsed_inc_count = excluded.lapsed_inc_count
      where excluded.as_of >= previous.as_of and
        (previous.cumulative_gwa, previous.counted_units, previous.failed_units,
          previous.is_delinquent, previous.lapsed_inc_count)
        is distinct from
        (excluded.cumulative_gwa, excluded.counted_units, excluded.failed_units,
          excluded.is_delinquent, excluded.lapsed_inc_count)
    returning student_id
  )
  insert into saais_private.cache_invalidation (student_id)
  select distinct student_id from updates
  on conflict (student_id) do update
    set revision = cache_invalidation.revision + 1, updated_at = clock_timestamp();
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create function public.recompute_lapsed_inc_gwa() returns integer
language sql security definer set search_path = pg_catalog as $$
  select saais_private.recompute_lapsed_inc_gwa((now() at time zone 'Asia/Manila')::date);
$$;
revoke all on function saais_private.matt_effective_attempts(uuid,date),
  saais_private.matt_student_summary(uuid,uuid,uuid,uuid,date),
  saais_private.recompute_lapsed_inc_gwa(date), public.recompute_lapsed_inc_gwa()
  from public, anon, authenticated;
grant execute on function public.recompute_lapsed_inc_gwa() to service_role;

-- Supabase cron uses UTC. Run at 00:01 Manila, ahead of the 00:05 alerts.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $job$select cron.schedule(
      'saais-daily-lapsed-inc-gwa', '1 16 * * *', 'select public.recompute_lapsed_inc_gwa()'
    )$job$;
  end if;
end;
$$;
