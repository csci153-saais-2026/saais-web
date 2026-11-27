create function saais_private.matt_grade_fix_history(p_attempt_id uuid) returns jsonb
language sql stable set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'changed_at', h.created_at,
    'old_grade', case when h.old_value->'final_grade' is distinct from h.new_value->'final_grade'
      then h.old_value->'final_grade' else h.old_value->'midterm_grade' end,
    'new_grade', case when h.old_value->'final_grade' is distinct from h.new_value->'final_grade'
      then h.new_value->'final_grade' else h.new_value->'midterm_grade' end,
    'actor_name', h.actor_name
  ) order by h.created_at desc, h.id desc), '[]'::jsonb)
  from (
    select l.* from public.audit_log_entry l where l.entity_type = 'attempt'
      and l.entity_id = p_attempt_id and l.action in ('correctGrades', 'prerequisite.grade_overridden')
    order by l.created_at desc, l.id desc limit 50
  ) h;
$$;

create function saais_private.matt_attempt_result(p_attempt_id uuid) returns jsonb
language plpgsql stable set search_path = pg_catalog, public as $$
declare
  v_attempt public.attempt;
  v_effective record;
begin
  select a.* into v_attempt from public.attempt a where a.id = p_attempt_id;
  select e.* into v_effective from saais_private.matt_effective_attempts(v_attempt.student_id) e
    where e.attempt_id = p_attempt_id;
  return (to_jsonb(v_attempt) - array['status', 'created_by', 'updated_by']) || jsonb_build_object(
    'recorded_status', v_attempt.status, 'effective_status', v_effective.effective_status,
    'completion_grade', v_effective.completion_grade, 'resolved_at', v_effective.resolved_at,
    'gwa_grade', v_effective.gwa_grade, 'is_lapsed_inc', v_effective.is_lapsed_inc,
    'is_repeated', v_effective.is_repeated, 'counts_toward_cumulative_gwa', v_effective.counts_toward_cumulative_gwa,
    'grade_fix_history', saais_private.matt_grade_fix_history(p_attempt_id)
  );
end
$$;

-- Shared by manual correction and grade flag correction. Explicit null clears a grade.
create function saais_private.matt_grade_values(p_previous public.attempt, p_body jsonb, p_term public.school_term)
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

  v_next.inc_deadline := case when v_next.status = 'inc' then coalesce(p_previous.inc_deadline, p_term.default_inc_deadline) end;
  return v_next;
end
$$;

create function saais_private.matt_apply_grade_correction(
  p_attempt public.attempt, p_department_id uuid, p_body jsonb, p_prerequisite boolean
) returns public.attempt language plpgsql set search_path = pg_catalog, public as $$
declare
  v_term public.school_term;
  v_offering public.course_offering;
  v_next public.attempt;
  v_action text := 'correctGrades';
  v_reason text := p_body->>'reason';
begin
  select o.* into v_offering from public.course_offering o where o.id = p_attempt.course_offering_id;
  v_term := saais_private.matt_grade_open_term(v_offering.school_term_id, p_department_id);
  if p_body->>'expected_revision' is not null and p_attempt.revision <> (p_body->>'expected_revision')::bigint then
    perform saais_private.matt_grade_conflict('STALE_REVISION', 'Reload the attempt before correcting grades.');
  end if;
  if exists (select 1 from public.inc_resolution i where i.attempt_id = p_attempt.id) then
    perform saais_private.matt_grade_conflict('INC_ALREADY_COMPLETED', 'Use the INC completion correction operation.');
  end if;
  if p_prerequisite then
    if p_attempt.status <> 'failed' or not exists (
      select 1 from public.prerequisite p where p.prerequisite_course_id = v_offering.course_id and p.type = 'strict'
    ) then
      perform saais_private.matt_grade_conflict('PREREQUISITE_NOT_ELIGIBLE',
        'The original failed attempt must be for a strict prerequisite.');
    end if;
    v_action := 'prerequisite.grade_overridden';
  end if;

  v_next := saais_private.matt_grade_values(p_attempt, p_body, v_term);
  if v_next.status in ('passed', 'failed', 'inc') and not p_attempt.prerequisite_override and exists (
    select 1 from saais_private.matt_unmet_prerequisites(
      p_attempt.student_id, v_offering.course_id, v_term.chronological_key
    )
  ) then
    perform saais_private.matt_grade_conflict('PREREQUISITE_NOT_MET', 'Resolve strict prerequisites before correcting this grade.');
  end if;
  if v_next.status <> 'passed' and exists (
    select 1 from public.equivalency_decision e where e.attempt_id = p_attempt.id and e.revoked_at is null
  ) then
    perform saais_private.matt_grade_conflict('ATTEMPT_IN_USE', 'The grade is in use by an active equivalency decision.');
  end if;

  update public.attempt a set
    status = v_next.status, midterm_status = v_next.midterm_status, midterm_grade = v_next.midterm_grade,
    final_grade = v_next.final_grade, inc_deadline = v_next.inc_deadline, instructor = v_next.instructor,
    prerequisite_grade_override = p_prerequisite or p_attempt.prerequisite_grade_override,
    updated_by = auth.uid(), updated_at = clock_timestamp(), revision = a.revision + 1
    where a.id = p_attempt.id returning * into v_next;
  perform saais_private.audit(v_action, 'attempt', v_next.id, to_jsonb(p_attempt), to_jsonb(v_next), v_next.student_id, v_reason);
  return v_next;
end
$$;

create function saais_private.matt_correct_grade_operation(p_params jsonb, p_body jsonb, p_prerequisite boolean)
returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_org jsonb := saais_private.matt_grade_student(v_student_id);
  v_department_id uuid := (v_org->>'department_id')::uuid;
  v_before public.attempt := saais_private.matt_grade_attempt(v_student_id, (p_params->>'attempt_id')::uuid);
  v_after public.attempt;
begin
  v_after := saais_private.matt_apply_grade_correction(v_before, v_department_id, p_body, p_prerequisite);
  perform saais_private.notify(
    case when p_prerequisite then 'prerequisite_grade_corrected' else 'grade_corrected' end,
    'grade', array[v_student_id] || saais_private.recipients(v_department_id, array['department_head']),
    'attempt', v_after.id, v_student_id
  );
  return saais_private.matt_attempt_result(v_after.id);
end
$$;

create function saais_private.matt_correctgrades(p_params jsonb, p_body jsonb) returns jsonb
language sql set search_path = pg_catalog, public as $$
  select saais_private.matt_correct_grade_operation(p_params, p_body, false);
$$;

create function saais_private.matt_correctprerequisitegrade(p_params jsonb, p_body jsonb) returns jsonb
language sql set search_path = pg_catalog, public as $$
  select saais_private.matt_correct_grade_operation(p_params, p_body, true);
$$;
