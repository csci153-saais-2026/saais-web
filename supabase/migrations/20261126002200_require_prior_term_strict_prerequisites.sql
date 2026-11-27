create or replace function saais_private.matt_unmet_prerequisites(
  p_student_id uuid, p_course_id uuid, p_term_order integer
) returns table(item jsonb)
language sql stable set search_path = pg_catalog, public as $$
  select jsonb_build_object(
    'prerequisite_course_id', c.id, 'code', c.code, 'title', c.title, 'type', 'strict',
    'current_status', coalesce(latest.status, 'not_taken'),
    'latest_attempt_id', latest.id, 'latest_final_grade', latest.grade
  )
  from public.prerequisite p
  join public.course c on c.id = p.prerequisite_course_id
  left join lateral (
    select a.id, coalesce(i.completion_grade, a.final_grade) as grade,
      case
        -- A pass in the selected term counts as concurrent enrollment for this check.
        when t.chronological_key = p_term_order and saais_private.passed(a.id) then 'currently_enrolled'
        when i.completion_grade > 3 then 'failed'
        when a.status = 'inc' and a.inc_deadline < (statement_timestamp() at time zone 'Asia/Manila')::date then 'lapsed_inc'
        when a.status = 'na' then 'not_taken' else a.status::text end as status
    from public.attempt a
    join public.course_offering o on o.id = a.course_offering_id
    join public.school_term t on t.id = o.school_term_id
    left join public.inc_resolution i on i.attempt_id = a.id
    where a.student_id = p_student_id and o.course_id = c.id and t.chronological_key <= p_term_order
    order by t.chronological_key desc, a.created_at desc, a.id desc
    limit 1
  ) latest on true
  where p.course_id = p_course_id and p.type = 'strict'
    and not exists (
      select 1
      from public.attempt a
      join public.course_offering o on o.id = a.course_offering_id
      join public.school_term t on t.id = o.school_term_id
      where a.student_id = p_student_id and o.course_id = c.id and t.chronological_key < p_term_order
        and saais_private.passed(a.id)
    )
  order by c.code, c.id;
$$;
