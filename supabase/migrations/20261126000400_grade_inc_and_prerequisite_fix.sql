-- Preserve recorded INC attempts across grade write paths and include same-term passes.
create or replace function saais_private.matt_grade_values(p_previous public.attempt, p_body jsonb, p_term public.school_term)
returns public.attempt language plpgsql set search_path = pg_catalog, public as $$
declare
  v_next public.attempt := p_previous;
  v_status text := p_body->>'status';
  v_change_midterm boolean := p_body ? 'midterm_grade' or p_body ? 'midterm_status';
begin
  if p_body ? 'midterm_grade' then v_next.midterm_grade := (p_body->>'midterm_grade')::numeric; end if;
  if v_change_midterm then
    v_next.midterm_status := case when p_body ? 'midterm_status' then p_body->>'midterm_status'
      when v_next.midterm_grade is not null then 'graded' end;
    if v_next.midterm_status is null and v_next.midterm_grade is not null then
      v_next.midterm_status := 'graded';
    end if;
  end if;
  if p_body ? 'final_grade' then v_next.final_grade := (p_body->>'final_grade')::numeric; end if;
  if p_body ? 'instructor' then v_next.instructor := nullif(btrim(p_body->>'instructor'), ''); end if;

  if v_next.midterm_status = 'dr' then
    v_next.midterm_grade := null;
    v_next.final_grade := null;
    v_next.status := 'dr';
  else
    if v_next.midterm_status = 'graded' and v_next.midterm_grade is null then
      perform saais_private.fail(400, 'A graded midterm must have a numeric grade.');
    end if;
    if v_status in ('inc', 'dr', 'na', 'currently_enrolled') then
      if v_next.final_grade is not null then
        perform saais_private.fail(400, 'Clear the final grade before setting a nonnumeric final status.');
      end if;
      v_next.status := v_status::public.attempt_status;
    elsif v_next.final_grade is not null then
      v_next.status := case when v_next.final_grade <= 3 then 'passed'::public.attempt_status else 'failed'::public.attempt_status end;
    elsif v_status in ('passed', 'failed') then
      perform saais_private.fail(400, 'Passed or failed requires a numeric final grade.');
    elsif p_previous.midterm_status = 'dr' or p_previous.status is null or p_previous.status in ('passed', 'failed') then
      v_next.status := 'currently_enrolled';
    end if;
  end if;

  if p_previous.id is not null and p_previous.status = 'inc'
    and (v_next.status is distinct from 'inc'::public.attempt_status or v_next.final_grade is not null) then
    perform saais_private.matt_grade_conflict('INC_NOT_ELIGIBLE',
      'Use the INC completion operation; the recorded INC status must be retained.');
  end if;

  v_next.inc_deadline := case when v_next.status = 'inc' then coalesce(p_previous.inc_deadline, p_term.default_inc_deadline) end;
  return v_next;
end
$$;

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
      case when i.completion_grade > 3 then 'failed'
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
      where a.student_id = p_student_id and o.course_id = c.id and t.chronological_key <= p_term_order
        and saais_private.passed(a.id)
    )
  order by c.code, c.id;
$$;
