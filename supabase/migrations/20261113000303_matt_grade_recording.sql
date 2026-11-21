create function saais_private.matt_record_grade_row(
  p_student_id uuid, p_org jsonb, p_term public.school_term, p_row jsonb, p_operation text
) returns uuid language plpgsql set search_path = pg_catalog, public as $$
declare
  v_offering public.course_offering;
  v_before public.attempt;
  v_after public.attempt;
  v_course public.course;
  v_mapping public.elective_mapping;
  v_new_mapping public.elective_mapping;
  v_slot public.curriculum_term_course;
  v_grade_input jsonb := p_row;
  v_curriculum_id uuid := (p_org->>'curriculum_version_id')::uuid;
  v_slot_id uuid := (p_row->>'curriculum_term_course_id')::uuid;
  v_reason text := nullif(btrim(p_row->>'prerequisite_override_reason'), '');
  v_remark text := nullif(btrim(p_row->>'remark'), '');
  v_override boolean := false;
  v_now timestamptz := clock_timestamp();
begin
  select o.* into v_offering from public.course_offering o
    where o.id = (p_row->>'course_offering_id')::uuid and o.school_term_id = p_term.id for share;
  if not found then
    perform saais_private.fail(404, 'Course offering not found in the selected term.');
  end if;
  select c.* into v_course from public.course c where c.id = v_offering.course_id for share;
  select a.* into v_before from public.attempt a
    where a.student_id = p_student_id and a.course_offering_id = v_offering.id for update;
  if p_row->>'attempt_id' is not null and v_before.id is distinct from (p_row->>'attempt_id')::uuid then
    perform saais_private.fail(404, 'The attempt does not belong to this student and offering.');
  end if;

  if v_before.id is null then
    if exists (
      select 1 from public.attempt a join public.course_offering o on o.id = a.course_offering_id
      where a.student_id = p_student_id and o.course_id = v_course.id and saais_private.passed(a.id)
    ) then
      perform saais_private.matt_grade_conflict('COURSE_ALREADY_PASSED', 'A passed course cannot be retaken.');
    end if;
    if p_operation = 'recordGrades' and (p_row->>'midterm_grade' is not null or p_row->>'midterm_status' is not null)
        and not coalesce((p_row->>'confirmed_enrollment')::boolean, false) then
      perform saais_private.matt_grade_conflict('ENROLLMENT_CONFIRMATION_REQUIRED',
        'Confirm new course enrollment before recording a midterm result.');
    end if;
  else
    if p_operation = 'recordGrades' and p_row->>'midterm_grade' is null and p_row->>'midterm_status' is null
        and p_row->>'final_grade' is null and p_row->>'status' is null then
      perform saais_private.matt_grade_conflict('ALREADY_ENROLLED', 'This student is already enrolled in the selected offering.');
    end if;
    if p_operation = 'recordGrades' then
      if (p_row->>'midterm_grade' is not null or p_row->>'midterm_status' is not null)
          and (v_before.midterm_grade is not null or v_before.midterm_status = 'dr')
          or (p_row->>'final_grade' is not null or p_row->>'status' is not null or p_row->>'midterm_status' = 'dr')
          and v_before.status <> 'currently_enrolled' then
        perform saais_private.matt_grade_conflict('GRADE_ALREADY_RECORDED', 'Use grade correction for an existing result.');
      end if;
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_grade_input
        from jsonb_each(p_row)
        where key not in ('midterm_grade', 'final_grade', 'midterm_status', 'status') or value <> 'null'::jsonb;
    end if;
    select m.* into v_mapping from public.elective_mapping m where m.attempt_id = v_before.id and m.revoked_at is null for update;
  end if;

  v_after := saais_private.matt_grade_values(v_before, v_grade_input, p_term);
  if v_before.id is not null and exists (select 1 from public.inc_resolution i where i.attempt_id = v_before.id)
      and (v_after.status is distinct from v_before.status or v_after.final_grade is distinct from v_before.final_grade) then
    perform saais_private.matt_grade_conflict('INC_ALREADY_COMPLETED', 'Use the INC completion correction operation.');
  end if;
  if v_before.id is not null and saais_private.passed(v_before.id) and v_after.status <> 'passed'
      and v_after.status <> v_before.status and exists (
    select 1 from public.equivalency_decision e where e.attempt_id = v_before.id and e.revoked_at is null
  ) then
    perform saais_private.matt_grade_conflict('ATTEMPT_IN_USE', 'The grade is in use by an active equivalency decision.');
  end if;

  if (v_before.id is null or p_operation = 'recordGrades' or
      (v_after.midterm_grade, v_after.final_grade, v_after.status) is distinct from
      (v_before.midterm_grade, v_before.final_grade, v_before.status))
      and not coalesce(v_before.prerequisite_override, false) and exists (
    select 1 from saais_private.matt_unmet_prerequisites(p_student_id, v_course.id, p_term.chronological_key)
  ) then
    if not coalesce((p_row->>'continue_with_prerequisite_override')::boolean, false) or v_reason is null then
      perform saais_private.matt_grade_conflict('PREREQUISITE_NOT_MET',
        'Clear strict prerequisites or explicitly confirm the override with a reason.');
    end if;
    v_override := true;
  end if;

  if v_before.id is not null and not p_row ? 'curriculum_term_course_id' then
    v_after.curriculum_term_course_id := v_before.curriculum_term_course_id;
  else
    if v_slot_id is null then v_slot_id := saais_private.matt_direct_slot(v_curriculum_id, v_course.id); end if;
    if v_slot_id is not null then
      select s.* into v_slot from public.curriculum_term_course s
        join public.curriculum_term t on t.id = s.curriculum_term_id
        where s.id = v_slot_id and t.curriculum_version_id = v_curriculum_id for share of s;
      if not found or (not v_slot.is_elective_slot and v_slot.course_id is distinct from v_course.id) then
        perform saais_private.fail(400, 'Choose a matching slot in the student’s current curriculum.');
      end if;
      if v_slot.is_elective_slot and not v_course.is_elective then
        perform saais_private.fail(400, 'Only an elective course can be assigned to an elective slot.');
      end if;
    end if;
    v_after.curriculum_term_course_id := case when not v_slot.is_elective_slot then v_slot.id end;
    if v_mapping.id is not null and v_slot.is_elective_slot is distinct from true then
      update public.elective_mapping m set
        revoked_at = v_now, revoked_by = auth.uid(), updated_at = v_now,
        revocation_reason = 'Elective slot cleared during grade entry.'
        where m.id = v_mapping.id returning * into v_new_mapping;
      perform saais_private.audit('revokeElectiveMapping', 'elective_mapping', v_mapping.id,
        to_jsonb(v_mapping), to_jsonb(v_new_mapping), p_student_id, v_new_mapping.revocation_reason);
    end if;
  end if;

  if v_before.id is null then
    insert into public.attempt (
      student_id, course_offering_id, curriculum_term_course_id, status, midterm_status, midterm_grade,
      final_grade, inc_deadline, instructor, units_attempted, prerequisite_override, created_by, updated_by, updated_at
    ) values (
      p_student_id, v_offering.id, v_after.curriculum_term_course_id, v_after.status,
      v_after.midterm_status, v_after.midterm_grade, v_after.final_grade, v_after.inc_deadline,
      case when p_row ? 'instructor' then v_after.instructor else v_offering.instructor end,
      v_course.units, v_override, auth.uid(), auth.uid(), v_now
    ) returning * into v_after;
  else
    update public.attempt a set curriculum_term_course_id = v_after.curriculum_term_course_id,
      status = v_after.status, midterm_status = v_after.midterm_status, midterm_grade = v_after.midterm_grade,
      final_grade = v_after.final_grade, inc_deadline = v_after.inc_deadline, instructor = v_after.instructor,
      prerequisite_override = v_override or v_before.prerequisite_override, updated_by = auth.uid(),
      updated_at = v_now, revision = a.revision + 1
      where a.id = v_before.id returning * into v_after;
  end if;

  if v_slot.is_elective_slot then
    if v_mapping.id is null then
      insert into public.elective_mapping (
        student_id, attempt_id, curriculum_term_course_id, mapped_by, units_credited, justification
      ) values (
        p_student_id, v_after.id, v_slot.id, auth.uid(), v_after.units_attempted,
        coalesce(nullif(btrim(p_row->>'elective_mapping_justification'), ''), 'Elective slot selected during grade entry.')
      ) returning * into v_new_mapping;
      perform saais_private.audit('createElectiveMapping', 'elective_mapping', v_new_mapping.id, null,
        to_jsonb(v_new_mapping), p_student_id, v_new_mapping.justification);
    elsif v_mapping.curriculum_term_course_id <> v_slot.id or p_row->>'elective_mapping_justification' is not null then
      update public.elective_mapping m set curriculum_term_course_id = v_slot.id, mapped_by = auth.uid(),
        justification = coalesce(nullif(btrim(p_row->>'elective_mapping_justification'), ''), v_mapping.justification),
        updated_at = v_now
        where m.id = v_mapping.id returning * into v_new_mapping;
      perform saais_private.audit('updateElectiveMapping', 'elective_mapping', v_mapping.id,
        to_jsonb(v_mapping), to_jsonb(v_new_mapping), p_student_id, v_new_mapping.justification);
    end if;
  end if;

  if v_remark is not null and v_remark is distinct from (
    select r.body_text from public.attempt_remark r where r.attempt_id = v_after.id
    order by r.created_at desc, r.id desc limit 1
  ) then
    insert into public.attempt_remark (student_id, attempt_id, authored_by, body_text, created_at)
    values (p_student_id, v_after.id, auth.uid(), v_remark, v_now);
  end if;
  perform saais_private.audit(p_operation, 'attempt', v_after.id,
    case when v_before.id is not null then to_jsonb(v_before) end, to_jsonb(v_after), p_student_id);
  if v_override then
    perform saais_private.audit('attempt.prerequisite_override', 'attempt', v_after.id,
      case when v_before.id is not null then to_jsonb(v_before) end, to_jsonb(v_after), p_student_id, v_reason);
  end if;
  if (v_after.midterm_grade, v_after.midterm_status) is distinct from (v_before.midterm_grade, v_before.midterm_status)
      and (v_after.midterm_grade is not null or v_after.midterm_status is not null) then
    perform saais_private.notify('midterm_grades_posted', 'grade', array[p_student_id], 'attempt', v_after.id, p_student_id);
  end if;
  if (v_after.status, v_after.final_grade) is distinct from (v_before.status, v_before.final_grade)
      and v_after.status <> 'currently_enrolled' then
    perform saais_private.notify('final_grades_posted', 'grade', array[p_student_id], 'attempt', v_after.id, p_student_id);
  end if;
  return v_after.id;
end
$$;

create function saais_private.matt_recordgrades(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_org jsonb := saais_private.matt_grade_student(v_student_id);
  v_term public.school_term := saais_private.matt_grade_open_term(
    (p_body->>'school_term_id')::uuid, (v_org->>'department_id')::uuid
  );
  v_attempt_id uuid;
begin
  v_attempt_id := saais_private.matt_record_grade_row(v_student_id, v_org, v_term, p_body, 'recordGrades');
  return saais_private.matt_attempt_result(v_attempt_id);
end
$$;

create function saais_private.matt_encodetermgrades(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_org jsonb := saais_private.matt_grade_student(v_student_id);
  v_term public.school_term := saais_private.matt_grade_open_term(
    (p_body->>'school_term_id')::uuid, (v_org->>'department_id')::uuid
  );
  v_before public.attempt;
  v_removed_id uuid;
  v_row jsonb;
  v_attempt_ids uuid[] := array[]::uuid[];
  v_result jsonb;
begin
  if exists (
    select 1 from jsonb_array_elements(p_body->'rows') r group by (r->>'course_offering_id')::uuid having count(*) > 1
  ) then
    perform saais_private.matt_grade_conflict('DUPLICATE_OFFERING', 'Each offering can appear only once.');
  end if;
  for v_removed_id in select value::uuid from jsonb_array_elements_text(p_body->'remove_attempt_ids') loop
    v_before := saais_private.matt_grade_attempt(v_student_id, v_removed_id);
    if not exists (select 1 from public.course_offering o where o.id = v_before.course_offering_id and o.school_term_id = v_term.id) then
      perform saais_private.fail(404, 'The removed attempt is not in the selected term.');
    end if;
    if exists (select 1 from jsonb_array_elements(p_body->'rows') r
      where (r->>'course_offering_id')::uuid = v_before.course_offering_id or (r->>'attempt_id')::uuid = v_removed_id) then
      perform saais_private.matt_grade_conflict('DUPLICATE_OFFERING', 'An offering cannot be updated and removed together.');
    end if;
    perform saais_private.matt_remove_attempt(v_before);
  end loop;
  for v_row in select value from jsonb_array_elements(p_body->'rows') loop
    v_attempt_ids := array_append(v_attempt_ids,
      saais_private.matt_record_grade_row(v_student_id, v_org, v_term, v_row, 'encodeTermGrades'));
  end loop;
  select coalesce(jsonb_agg(saais_private.matt_attempt_result(id) order by ord), '[]'::jsonb) into v_result
    from unnest(v_attempt_ids) with ordinality as a(id, ord);
  return v_result;
end
$$;
