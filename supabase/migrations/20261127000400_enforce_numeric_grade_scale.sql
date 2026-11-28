-- Enforce the institutional numeric course grade scale (1.00–3.00 in 0.25 steps,
-- plus 5.00 as the only numeric failing grade) across runtime contract schemas,
-- write RPCs, and database constraints while keeping historical off-scale rows
-- readable and preserving audit history.

create or replace function saais_private.is_valid_numeric_grade(p_grade numeric)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select p_grade = 5 or (p_grade between 1 and 3 and mod(p_grade * 4, 1) = 0);
$$;

revoke all on function saais_private.is_valid_numeric_grade(numeric)
  from public, anon, authenticated;

do $$
declare
  v_nullable_grade jsonb := jsonb_build_object(
    'anyOf', jsonb_build_array(
      jsonb_build_object('type', 'number', 'minimum', 1, 'maximum', 3, 'multipleOf', 0.25),
      jsonb_build_object('type', 'number', 'const', 5),
      jsonb_build_object('type', 'null')
    )
  );
  v_required_grade jsonb := jsonb_build_object(
    'anyOf', jsonb_build_array(
      jsonb_build_object('type', 'number', 'minimum', 1, 'maximum', 3, 'multipleOf', 0.25),
      jsonb_build_object('type', 'number', 'const', 5)
    )
  );
  v_doc jsonb;
begin
  -- Update the runtime contract snapshots in both tables without altering
  -- historical baseline contract migrations.
  select document into v_doc from saais_private.matt_contract where id;
  if v_doc is not null then
    v_doc := jsonb_set(v_doc, '{schemas,RecordGradesRequest,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,RecordGradesRequest,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,EncodeTermGradeRowInput,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,EncodeTermGradeRowInput,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeBatchImportRowInput,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeBatchImportRowInput,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeCorrectionRequest,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeCorrectionRequest,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeFlagResolveRequest,properties,corrected_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,INCCompletionRequest,properties,completion_grade}', v_required_grade);
    v_doc := jsonb_set(v_doc, '{schemas,INCCompletionCorrectionRequest,properties,completion_grade}', v_required_grade);
    update saais_private.matt_contract set document = v_doc where id;
  end if;

  select document into v_doc from saais_private.contract where id;
  if v_doc is not null then
    v_doc := jsonb_set(v_doc, '{schemas,RecordGradesRequest,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,RecordGradesRequest,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,EncodeTermGradeRowInput,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,EncodeTermGradeRowInput,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeBatchImportRowInput,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeBatchImportRowInput,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeCorrectionRequest,properties,midterm_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeCorrectionRequest,properties,final_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,GradeFlagResolveRequest,properties,corrected_grade}', v_nullable_grade);
    v_doc := jsonb_set(v_doc, '{schemas,INCCompletionRequest,properties,completion_grade}', v_required_grade);
    v_doc := jsonb_set(v_doc, '{schemas,INCCompletionCorrectionRequest,properties,completion_grade}', v_required_grade);
    update saais_private.contract set document = v_doc where id;
  end if;
end
$$;

create or replace function saais_private.matt_grade_values(p_previous public.attempt, p_body jsonb, p_term public.school_term)
returns public.attempt language plpgsql set search_path = pg_catalog, public as $$
declare
  v_next public.attempt := p_previous;
  v_status text := p_body->>'status';
  v_change_midterm boolean := p_body ? 'midterm_grade' or p_body ? 'midterm_status';
begin
  if p_body ? 'midterm_grade' then
    v_next.midterm_grade := (p_body->>'midterm_grade')::numeric;
    if v_next.midterm_grade is not null and not saais_private.is_valid_numeric_grade(v_next.midterm_grade) then
      perform saais_private.fail(400, 'Use a numeric grade from 1.00 to 3.00 in 0.25 steps, or 5.00.');
    end if;
  end if;
  if v_change_midterm then
    v_next.midterm_status := case when p_body ? 'midterm_status' then p_body->>'midterm_status'
      when v_next.midterm_grade is not null then 'graded' end;
    if v_next.midterm_status is null and v_next.midterm_grade is not null then
      v_next.midterm_status := 'graded';
    end if;
  end if;
  if p_body ? 'final_grade' then
    v_next.final_grade := (p_body->>'final_grade')::numeric;
    if v_next.final_grade is not null and not saais_private.is_valid_numeric_grade(v_next.final_grade) then
      perform saais_private.fail(400, 'Use a numeric grade from 1.00 to 3.00 in 0.25 steps, or 5.00.');
    end if;
  end if;
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

create or replace function saais_private.matt_inc_change(
  p_student_id uuid, p_attempt_id uuid, p_body jsonb, p_correction boolean
) returns jsonb language plpgsql set search_path = pg_catalog, public as $$
declare
  v_org jsonb := saais_private.matt_grade_student(p_student_id);
  v_attempt public.attempt := saais_private.matt_grade_attempt(p_student_id, p_attempt_id);
  v_now timestamptz := clock_timestamp();
  v_term_id uuid;
  v_before public.inc_resolution;
  v_after public.inc_resolution;
  v_reason text := p_body->>'reason';
  v_completion_grade numeric := (p_body->>'completion_grade')::numeric;
begin
  if v_completion_grade is null or not saais_private.is_valid_numeric_grade(v_completion_grade) then
    perform saais_private.fail(400, 'Use a numeric grade from 1.00 to 3.00 in 0.25 steps, or 5.00.');
  end if;

  select i.* into v_before from public.inc_resolution i where i.attempt_id = p_attempt_id for update;

  if p_correction then
    select o.school_term_id into v_term_id from public.course_offering o where o.id = v_attempt.course_offering_id;
    perform saais_private.matt_grade_open_term(v_term_id, (v_org->>'department_id')::uuid);
    if v_attempt.status <> 'inc' or v_before.id is null then
      perform saais_private.matt_grade_conflict('INC_NOT_ELIGIBLE', 'An existing INC completion is required.');
    end if;
    if v_before.updated_at is distinct from (p_body->>'expected_updated_at')::timestamptz then
      perform saais_private.matt_grade_conflict('STALE_REVISION', 'Reload the completion before correcting it.');
    end if;
    update public.inc_resolution i
      set completion_grade = v_completion_grade,
        reason = v_reason, updated_by = auth.uid(), updated_at = v_now
      where i.id = v_before.id returning * into v_after;
  else
    if v_attempt.status <> 'inc' or v_before.id is not null
        or v_attempt.inc_deadline < (v_now at time zone 'Asia/Manila')::date then
      perform saais_private.matt_grade_conflict('INC_NOT_ELIGIBLE',
        'Only an unresolved INC on or before its deadline can be completed.');
    end if;
    insert into public.inc_resolution (
      student_id, attempt_id, completion_grade, resolved_by, resolved_at, reason, updated_at, updated_by
    ) values (
      p_student_id, p_attempt_id, v_completion_grade,
      auth.uid(), v_now, v_reason, v_now, auth.uid()
    ) returning * into v_after;
  end if;

  perform saais_private.audit(
    case when p_correction then 'correctINCCompletion' else 'completeINC' end,
    'inc_resolution', v_after.id, case when v_before.id is not null then to_jsonb(v_before) end,
    to_jsonb(v_after), p_student_id, v_reason
  );
  perform saais_private.notify('inc_completed', 'grade', array[p_student_id],
    'inc_resolution', v_after.id, p_student_id);
  return to_jsonb(v_after) - 'reason';
end
$$;

create or replace function saais_private.matt_resolvegradeflag(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_actor uuid := saais_private.actor();
  v_flag_id uuid := (p_params->>'flag_id')::uuid;
  v_today date := (statement_timestamp() at time zone 'Asia/Manila')::date;
  v_student_id uuid;
  v_department_id uuid;
  v_adviser_id uuid;
  v_before public.grade_flag;
  v_after public.grade_flag;
  v_attempt public.attempt;
  v_corrected public.attempt;
  v_correction jsonb;
  v_now timestamptz := clock_timestamp();
begin
  perform saais_private.require_scope(array['adviser', 'department_head', 'admin']);
  if p_body ? 'corrected_grade' and p_body->>'corrected_grade' is not null
      and not saais_private.is_valid_numeric_grade((p_body->>'corrected_grade')::numeric) then
    perform saais_private.fail(400, 'Use a numeric grade from 1.00 to 3.00 in 0.25 steps, or 5.00.');
  end if;

  select f.student_id into v_student_id from public.grade_flag f where f.id = v_flag_id;
  if not found then
    perform saais_private.fail(404, 'Grade flag not found.');
  end if;
  perform 1 from public.profile p where p.id = v_student_id for update;
  v_department_id := (saais_private.organization(v_student_id)->>'department_id')::uuid;
  select a.adviser_id into v_adviser_id
  from public.adviser_assignment a join public.profile p on p.id = a.adviser_id
  where a.student_id = v_student_id and a.start_date <= v_today and (a.end_date is null or a.end_date > v_today)
    and p.status = 'active' and exists (
      select 1 from public.role_assignment r where r.profile_id = p.id and r.role = 'adviser'
    )
  order by a.start_date desc limit 1;

  if v_adviser_id is not null then
    if v_adviser_id <> v_actor or not saais_private.has_role('adviser') then
      perform saais_private.fail(403, 'This flag is assigned to another adviser.');
    end if;
    perform saais_private.require_scope(array['adviser']);
  elsif v_department_id is null then
    perform saais_private.require_scope(array['admin']);
  else
    perform saais_private.require_scope(array['department_head', 'admin'], v_department_id);
  end if;

  select f.* into v_before from public.grade_flag f where f.id = v_flag_id for update;
  if v_before.status <> 'open' then
    perform saais_private.matt_grade_conflict('GRADE_FLAG_ALREADY_RESOLVED', 'This grade flag has already been resolved.');
  end if;
  if p_body->>'resolution_action' = 'correct' then
    if v_department_id is null then
      perform saais_private.fail(409, 'The student has no current department for an encoding check.');
    end if;
    v_attempt := saais_private.matt_grade_attempt(v_student_id, v_before.attempt_id);
    v_correction := jsonb_build_object('reason', p_body->>'resolution_note', 'expected_revision', p_body->'expected_revision');
    if v_before.reported_stage = 'midterm' then
      if p_body ? 'corrected_grade' then v_correction := v_correction || jsonb_build_object('midterm_grade', p_body->'corrected_grade'); end if;
      if p_body ? 'corrected_midterm_status' then v_correction := v_correction || jsonb_build_object('midterm_status', p_body->'corrected_midterm_status'); end if;
    elsif p_body ? 'corrected_grade' then
      v_correction := v_correction || jsonb_build_object('final_grade', p_body->'corrected_grade');
    end if;
    if p_body->>'corrected_status' is not null then
      v_correction := v_correction || jsonb_build_object('status', p_body->>'corrected_status');
      if p_body->>'corrected_status' in ('inc', 'dr', 'na', 'currently_enrolled') and not v_correction ? 'final_grade' then
        v_correction := v_correction || '{"final_grade":null}'::jsonb;
      end if;
    end if;
    if not v_correction ?| array['midterm_grade', 'midterm_status', 'final_grade', 'status'] then
      perform saais_private.fail(400, 'Specify the corrected grade or status.');
    end if;
    v_corrected := saais_private.matt_apply_grade_correction(v_attempt, v_department_id, v_correction, false);
  end if;

  update public.grade_flag f set
    status = case when v_corrected.id is not null then 'corrected' else 'rejected' end,
    resolution_action = p_body->>'resolution_action',
    corrected_grade = case when v_before.reported_stage = 'midterm' then v_corrected.midterm_grade else v_corrected.final_grade end,
    corrected_status = v_corrected.status,
    resolution_note = p_body->>'resolution_note', resolved_by = v_actor, resolved_at = v_now, updated_at = v_now
    where f.id = v_flag_id returning * into v_after;
  perform saais_private.audit('resolveGradeFlag', 'grade_flag', v_flag_id,
    to_jsonb(v_before), to_jsonb(v_after), v_student_id, v_after.resolution_note);
  perform saais_private.notify('grade_flag_resolved', 'flag', array[v_student_id, v_adviser_id],
    'grade_flag', v_flag_id, v_student_id);
  return to_jsonb(v_after);
end
$$;

-- Enforce the agreed scale on all new inserts and updates while keeping any
-- historical off-scale rows readable and audit history intact (NOT VALID).
alter table public.attempt
  add constraint attempt_midterm_grade_scale_valid check (
    midterm_grade is null
    or midterm_grade = 5
    or (midterm_grade between 1 and 3 and mod(midterm_grade * 4, 1) = 0)
  ) not valid,
  add constraint attempt_final_grade_scale_valid check (
    final_grade is null
    or final_grade = 5
    or (final_grade between 1 and 3 and mod(final_grade * 4, 1) = 0)
  ) not valid;

alter table public.inc_resolution
  add constraint inc_resolution_completion_grade_scale_valid check (
    completion_grade = 5
    or (completion_grade between 1 and 3 and mod(completion_grade * 4, 1) = 0)
  ) not valid;

alter table public.grade_flag
  add constraint grade_flag_corrected_grade_scale_valid check (
    corrected_grade is null
    or corrected_grade = 5
    or (corrected_grade between 1 and 3 and mod(corrected_grade * 4, 1) = 0)
  ) not valid;
