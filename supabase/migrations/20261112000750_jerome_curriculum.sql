create function saais_private.passing_sources(student uuid) returns table(attempt_id uuid,course_id uuid,units numeric,grade numeric)
language sql stable set search_path=pg_catalog,public as $$
  with sources as (
    select a.id,o.course_id,a.units_attempted,coalesce(i.completion_grade,a.final_grade) as grade,c.repeatable_type,
      row_number() over(partition by o.course_id order by st.chronological_key desc,a.created_at desc,a.id) as rn
    from public.attempt a join public.course_offering o on o.id=a.course_offering_id join public.course c on c.id=o.course_id
    join public.school_term st on st.id=o.school_term_id left join public.inc_resolution i on i.attempt_id=a.id
    where a.student_id=student and (a.status='passed' or (a.status='inc' and i.completion_grade<=3))
  ) select id,course_id,units_attempted,grade from sources where repeatable_type='additional_credit' or rn=1;
$$;
create function saais_private.shift_matches(student uuid, target uuid) returns table(attempt_id uuid,slot_id uuid,units numeric,grade numeric)
language plpgsql stable set search_path=pg_catalog,public as $$
declare slot record; candidate record; used uuid[]:='{}'; old_version uuid:=(saais_private.organization(student)->>'curriculum_version_id')::uuid;
begin
  for slot in select s.id,s.course_id from public.curriculum_term_course s join public.curriculum_term t on t.id=s.curriculum_term_id
    where t.curriculum_version_id=target and not s.is_elective_slot order by t.year_level,t.term_sequence,s.id
  loop
    select a.* into candidate from saais_private.passing_sources(student) a
      where not a.attempt_id=any(used) and (a.course_id=slot.course_id or exists(select 1 from public.curriculum_pair_equivalence e
        where e.from_curriculum_version_id=old_version and e.to_curriculum_version_id=target and e.source_course_id=a.course_id and e.target_course_id=slot.course_id))
      and not exists(select 1 from public.elective_mapping m where m.attempt_id=a.attempt_id and m.revoked_at is null)
      and not exists(select 1 from public.equivalency_decision e where e.attempt_id=a.attempt_id and e.revoked_at is null)
      order by (a.course_id=slot.course_id) desc,a.attempt_id limit 1;
    if found then used:=array_append(used,candidate.attempt_id); attempt_id:=candidate.attempt_id; slot_id:=slot.id; units:=candidate.units; grade:=candidate.grade; return next; end if;
  end loop;
end $$;
create function saais_private.shift_preview(student uuid, target uuid) returns jsonb
language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('carried_units',coalesce(sum(m.units),0),
    'lost_units',greatest(0,(select coalesce(sum(s.units),0) from saais_private.passing_sources(student) s)-coalesce(sum(m.units),0)),
    'projected_gwa',sum(m.units*m.grade)/nullif(sum(m.units),0),'mutates_records',false) from saais_private.shift_matches(student,target) m;
$$;
create function saais_private.assign_curriculum(student uuid, target uuid, program uuid, start_date date, reason text) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
#variable_conflict use_variable
declare previous public.student_curriculum_assignment; version public.curriculum_version; org jsonb; matches jsonb; m jsonb; record_id uuid;
begin
  select a.* into previous from public.student_curriculum_assignment a where a.student_id=student and a.end_date is null for update;
  if not found then perform saais_private.fail(409,'Student has no current curriculum.'); end if;
  select v.* into version from public.curriculum_version v where v.id=target for share;
  if not found then perform saais_private.fail(404,'Target curriculum not found.'); end if;
  if version.program_id<>program then perform saais_private.fail(400,'Program and curriculum do not match.'); end if;
  if previous.curriculum_version_id=target then perform saais_private.fail(409,'Student is already assigned to this curriculum.'); end if;
  if start_date<=previous.start_date or start_date>(now() at time zone 'Asia/Manila')::date or version.status<>'active' or
    start_date<version.effective_start or (version.effective_end is not null and start_date>version.effective_end) then
    perform saais_private.fail(409,'The requested assignment date or curriculum lifecycle is invalid.'); end if;
  select coalesce(jsonb_agg(to_jsonb(mm)),'[]') into matches from saais_private.shift_matches(student,target) mm;
  update public.student_curriculum_assignment a set end_date=start_date where a.id=previous.id;
  insert into public.student_curriculum_assignment(student_id,curriculum_version_id,start_date,reason)
    values(student,target,start_date,reason) returning id into record_id;
  -- A passed original source is linked to one new requirement. No attempts,
  -- adviser assignments, earlier decisions or saved plans are overwritten.
  for m in select * from jsonb_array_elements(matches) loop
    insert into public.equivalency_decision(student_id,attempt_id,destination_curriculum_term_course_id,decision_type,decided_by,units_credited,justification)
      values(student,(m->>'attempt_id')::uuid,(m->>'slot_id')::uuid,'transfer_equivalency',auth.uid(),(m->>'units')::numeric,reason);
  end loop;
  org:=saais_private.organization(student);
  perform saais_private.audit('assignStudentCurriculum','student_curriculum_assignment',record_id,to_jsonb(previous),org,student,reason);
  perform saais_private.notify('curriculum_reassigned','transfer',array[student,(org->>'adviser_id')::uuid],'student_curriculum_assignment',record_id,student);
  return org;
end $$;

create function saais_private.curriculum(operation text, params jsonb, body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare student uuid:=(params->>'student_id')::uuid; target uuid; org jsonb; transfer public.curriculum_transfer_request;
  result jsonb; before_row jsonb; destination public.curriculum_version; source_department uuid;
begin
  if operation='decideCurriculumTransfer' then
    select t.* into transfer from public.curriculum_transfer_request t where t.id=(params->>'transfer_id')::uuid for update;
    if not found then perform saais_private.fail(404,'Curriculum transfer not found.'); end if;
    student:=transfer.student_id;
    org:=saais_private.student_access(student,array['department_head','admin']);
    if transfer.status<>'pending' then perform saais_private.fail(409,'This transfer has already been decided.'); end if;
    if transfer.from_curriculum_version_id<>(org->>'curriculum_version_id')::uuid then perform saais_private.fail(409,'The endorsed source curriculum is no longer current.'); end if;
    before_row:=to_jsonb(transfer);
    if body->>'decision'='approved' then
      select v.* into destination from public.curriculum_version v where v.id=transfer.to_curriculum_version_id for share;
      result:=saais_private.shift_preview(student,destination.id);
      perform saais_private.assign_curriculum(student,destination.id,destination.program_id,(now() at time zone 'Asia/Manila')::date,coalesce(nullif(btrim(body->>'decision_note'),''),transfer.endorsement_note));
    end if;
    update public.curriculum_transfer_request t set status=body->>'decision',decided_by=auth.uid(),decided_at=clock_timestamp(),decision_note=body->>'decision_note',
      carried_units=coalesce((result->>'carried_units')::numeric,t.carried_units),updated_at=clock_timestamp() where t.id=transfer.id returning to_jsonb(t) into result;
    perform saais_private.audit(operation,'curriculum_transfer_request',transfer.id,before_row,result,student,body->>'decision_note');
    perform saais_private.notify('curriculum_transfer_decided','transfer',array[student,(org->>'adviser_id')::uuid],'curriculum_transfer_request',transfer.id,student);
    return result;
  end if;
  if operation='previewCurriculumShift' then org:=saais_private.student_access(student,array['adviser','department_head','admin'],true); target:=(body->>'curriculum_version_id')::uuid;
  elsif operation='assignStudentCurriculum' then org:=saais_private.student_access(student,array['department_head','admin']); target:=(body->>'curriculum_version_id')::uuid;
  else org:=saais_private.student_access(student,array['adviser']); target:=(body->>'to_curriculum_version_id')::uuid; end if;
  select v.* into destination from public.curriculum_version v where v.id=target for share;
  if not found then perform saais_private.fail(404,'Target curriculum not found.'); end if;
  if operation='previewCurriculumShift' then return saais_private.shift_preview(student,target);
  elsif operation='assignStudentCurriculum' then
    return saais_private.assign_curriculum(student,target,(body->>'program_id')::uuid,(body->>'start_date')::date,body->>'reason');
  end if;
  if destination.id=(org->>'curriculum_version_id')::uuid or destination.status<>'active' or destination.effective_start>(now() at time zone 'Asia/Manila')::date or
    (destination.effective_end is not null and destination.effective_end<(now() at time zone 'Asia/Manila')::date) then perform saais_private.fail(409,'A different currently effective active target curriculum is required.'); end if;
  result:=saais_private.shift_preview(student,target);
  insert into public.curriculum_transfer_request(student_id,from_curriculum_version_id,to_curriculum_version_id,endorsed_by,endorsement_note,carried_units)
    values(student,(org->>'curriculum_version_id')::uuid,target,auth.uid(),body->>'endorsement_note',(result->>'carried_units')::numeric) returning to_jsonb(curriculum_transfer_request.*) into result;
  perform saais_private.audit(operation,'curriculum_transfer_request',(result->>'id')::uuid,null,result,student,body->>'endorsement_note');
  perform saais_private.notify('curriculum_transfer_endorsed','transfer',array_append(saais_private.recipients((org->>'department_id')::uuid,array['department_head']),student),'curriculum_transfer_request',(result->>'id')::uuid,student);
  return result;
end $$;

create function saais_private.students(operation text, params jsonb, body jsonb) returns jsonb language plpgsql set search_path=pg_catalog,public as $$
begin
  if operation in ('previewCurriculumShift','assignStudentCurriculum','endorseCurriculumTransfer','decideCurriculumTransfer') then return saais_private.curriculum(operation,params,body);
  else return saais_private.credits(operation,params,body); end if;
end $$;
