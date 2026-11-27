-- An explicit preview uses the contract's 409 when the proposed carried credit
-- is blocked. Pending transfer endorsements retain their projected totals.
drop function saais_private.shift_preview(uuid, uuid);
create function saais_private.shift_preview(
  student uuid, target uuid, reject_active_mapping boolean default false
) returns jsonb
language plpgsql stable set search_path=pg_catalog,public as $$
declare
  preview jsonb;
  blocked boolean;
begin
  select jsonb_build_object('carried_units',coalesce(sum(m.units),0),
    'lost_units',greatest(0,(select coalesce(sum(s.units),0) from saais_private.passing_sources(student) s)-coalesce(sum(m.units),0)),
    'projected_gwa',sum(m.units*m.grade)/nullif(sum(m.units),0),'mutates_records',false),
    coalesce(bool_or(reject_active_mapping and exists(
      select 1 from public.elective_mapping e where e.attempt_id=m.attempt_id and e.revoked_at is null
    )),false)
    into preview, blocked
    from saais_private.shift_preview_matches(student,target) m;
  if blocked then
    perform saais_private.fail(409,'Revoke the active elective mapping before shifting this curriculum.');
  end if;
  return preview;
end $$;
revoke all on function saais_private.shift_preview(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function saais_private.curriculum(operation text, params jsonb, body jsonb) returns jsonb
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
  if operation='previewCurriculumShift' then return saais_private.shift_preview(student,target,true);
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
