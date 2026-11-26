create function saais_private.shift_preview_matches(student uuid, target uuid) returns table(attempt_id uuid,slot_id uuid,units numeric,grade numeric)
language plpgsql stable set search_path=pg_catalog,public as $$
declare slot record; candidate record; used uuid[]:='{}'; old_version uuid:=(saais_private.organization(student)->>'curriculum_version_id')::uuid;
begin
  for slot in select s.id,s.course_id from public.curriculum_term_course s join public.curriculum_term t on t.id=s.curriculum_term_id
    where t.curriculum_version_id=target and not s.is_elective_slot order by t.year_level,t.term_sequence,s.id
  loop
    select a.* into candidate from saais_private.passing_sources(student) a
      where not a.attempt_id=any(used) and (a.course_id=slot.course_id or exists(select 1 from public.curriculum_pair_equivalence e
        where e.from_curriculum_version_id=old_version and e.to_curriculum_version_id=target and e.source_course_id=a.course_id and e.target_course_id=slot.course_id))
      and not exists(select 1 from public.equivalency_decision e where e.attempt_id=a.attempt_id and e.revoked_at is null)
      order by (a.course_id=slot.course_id) desc,a.attempt_id limit 1;
    if found then used:=array_append(used,candidate.attempt_id); attempt_id:=candidate.attempt_id; slot_id:=slot.id; units:=candidate.units; grade:=candidate.grade; return next; end if;
  end loop;
end $$;
create or replace function saais_private.shift_preview(student uuid, target uuid) returns jsonb
language sql stable set search_path=pg_catalog,public as $$
  select jsonb_build_object('carried_units',coalesce(sum(m.units),0),
    'lost_units',greatest(0,(select coalesce(sum(s.units),0) from saais_private.passing_sources(student) s)-coalesce(sum(m.units),0)),
    'projected_gwa',sum(m.units*m.grade)/nullif(sum(m.units),0),'mutates_records',false) from saais_private.shift_preview_matches(student,target) m;
$$;
create or replace function saais_private.assign_curriculum(student uuid, target uuid, program uuid, start_date date, reason text) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
#variable_conflict use_variable
declare previous public.student_curriculum_assignment; version public.curriculum_version; org jsonb; matches jsonb; has_active_mapping boolean; m jsonb; record_id uuid;
begin
  -- Serialize against concurrent credit/elective-mapping writers using the same
  -- profile -> assignment lock order enforced by credit_guard and student_access.
  perform 1 from public.profile p where p.id=student for update;
  select a.* into previous from public.student_curriculum_assignment a where a.student_id=student and a.end_date is null for update;
  if not found then perform saais_private.fail(409,'Student has no current curriculum.'); end if;
  select v.* into version from public.curriculum_version v where v.id=target for share;
  if not found then perform saais_private.fail(404,'Target curriculum not found.'); end if;
  if version.program_id<>program then perform saais_private.fail(400,'Program and curriculum do not match.'); end if;
  if previous.curriculum_version_id=target then perform saais_private.fail(409,'Student is already assigned to this curriculum.'); end if;
  if start_date<=previous.start_date or start_date>(now() at time zone 'Asia/Manila')::date or version.status<>'active' or
    start_date<version.effective_start or (version.effective_end is not null and start_date>version.effective_end) then
    perform saais_private.fail(409,'The requested assignment date or curriculum lifecycle is invalid.'); end if;
  with preview as (
    select m.*, exists(
      select 1 from public.elective_mapping e
      where e.attempt_id=m.attempt_id and e.revoked_at is null
    ) as has_mapping
    from saais_private.shift_preview_matches(student,target) m
  )
  select coalesce(bool_or(has_mapping),false),
    coalesce(jsonb_agg(jsonb_build_object('attempt_id',attempt_id,'slot_id',slot_id,'units',units,'grade',grade)),'[]')
    into has_active_mapping, matches
    from preview;
  if has_active_mapping then
    perform saais_private.fail(409,'A matched course has an active elective mapping. Resolve it before transferring credit.');
  end if;
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
