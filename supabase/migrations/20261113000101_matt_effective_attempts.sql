-- Keep effective term results separate from the one selected cumulative
-- contribution per course. A lapsed INC is worth 5.00 in its own term.
create function saais_private.matt_effective_attempts(p_student_id uuid)
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
      a.status = 'inc' and i.id is null and a.inc_deadline < (now() at time zone 'Asia/Manila')::date as is_lapsed_inc,
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

revoke all on function saais_private.matt_effective_attempts(uuid) from public, anon, authenticated;
