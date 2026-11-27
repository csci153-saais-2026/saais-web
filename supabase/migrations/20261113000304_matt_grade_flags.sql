create function saais_private.matt_creategradeflag(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_actor uuid := saais_private.actor();
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_today date := (statement_timestamp() at time zone 'Asia/Manila')::date;
  v_attempt public.attempt;
  v_flag public.grade_flag;
  v_department_id uuid;
  v_adviser_id uuid;
begin
  perform saais_private.require_scope(array['student']);
  if v_actor is distinct from v_student_id then
    perform saais_private.fail(403, 'Students can flag only their own grades.');
  end if;
  perform 1 from public.profile p where p.id = v_student_id for update;
  v_attempt := saais_private.matt_grade_attempt(v_student_id, (p_body->>'attempt_id')::uuid);
  v_department_id := (saais_private.organization(v_student_id)->>'department_id')::uuid;
  select a.adviser_id into v_adviser_id
  from public.adviser_assignment a
  where a.student_id = v_student_id and a.start_date <= v_today and (a.end_date is null or a.end_date > v_today)
  order by a.start_date desc limit 1;

  insert into public.grade_flag (student_id, attempt_id, reported_stage, reported_grade_text, issue_type, details)
  values (v_student_id, v_attempt.id, p_body->>'reported_stage', p_body->>'reported_grade_text',
    p_body->>'issue_type', p_body->>'details')
  returning * into v_flag;
  perform saais_private.audit('createGradeFlag', 'grade_flag', v_flag.id, null, to_jsonb(v_flag), v_student_id);
  perform saais_private.notify('grade_flag_submitted', 'flag',
    array[v_adviser_id] || saais_private.recipients(v_department_id, array['department_head']),
    'grade_flag', v_flag.id, v_student_id);
  return to_jsonb(v_flag);
end
$$;

create function saais_private.matt_resolvegradeflag(p_params jsonb, p_body jsonb) returns jsonb
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
      v_correction := v_correction || jsonb_build_object('status', p_body->'corrected_status');
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
