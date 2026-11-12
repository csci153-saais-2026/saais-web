create function saais_private.passed(attempt uuid) returns boolean language sql stable set search_path=pg_catalog,public as $$
  select exists(select 1 from public.attempt a left join public.inc_resolution i on i.attempt_id=a.id
    where a.id=passed.attempt and (a.status='passed' or (a.status='inc' and i.completion_grade<=3)));
$$;
create function saais_private.credit_available(student uuid, source uuid, destination uuid, ignore_entity text default null, ignore_id uuid default null) returns void
language plpgsql set search_path=pg_catalog,public as $$
begin
  if exists(select 1 from public.elective_mapping m where m.student_id=student and m.revoked_at is null and
    (m.attempt_id=source or m.curriculum_term_course_id=destination) and not (coalesce(ignore_entity,'')='elective_mapping' and m.id=ignore_id)) or
    exists(select 1 from public.equivalency_decision e where e.student_id=student and e.revoked_at is null and
    (e.attempt_id=source or e.destination_curriculum_term_course_id=destination) and not (coalesce(ignore_entity,'')='equivalency_decision' and e.id=ignore_id)) or
    exists(select 1 from public.outside_credit c where c.student_id=student and c.revoked_at is null and
      c.destination_curriculum_term_course_id=destination and not (coalesce(ignore_entity,'')='outside_credit' and c.id=ignore_id)) then
    perform saais_private.fail(409,'A live credit already uses the source or destination.'); end if;
  if exists(select 1 from public.attempt a where a.student_id=student and a.curriculum_term_course_id=destination and saais_private.passed(a.id)) then
    perform saais_private.fail(409,'The destination is already satisfied by a direct completion.'); end if;
  if source is not null and exists(select 1 from public.attempt a join public.curriculum_term_course s on s.id=a.curriculum_term_course_id
    join public.curriculum_term t on t.id=s.curriculum_term_id where a.id=source and saais_private.passed(a.id)
      and t.curriculum_version_id=(saais_private.organization(student)->>'curriculum_version_id')::uuid) then
    perform saais_private.fail(409,'The source already satisfies a current direct requirement.'); end if;
end $$;

-- The same invariant applies to all writers, including future grade handlers.
create function saais_private.credit_guard() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare destination uuid; source uuid; org jsonb; slot public.curriculum_term_course; a public.attempt;
begin
  perform 1 from public.profile p where p.id=new.student_id for update;
  if new.revoked_at is not null then return new; end if;
  org:=saais_private.organization(new.student_id);
  if tg_table_name='elective_mapping' then destination:=new.curriculum_term_course_id; source:=new.attempt_id;
  elsif tg_table_name='equivalency_decision' then destination:=new.destination_curriculum_term_course_id; source:=new.attempt_id;
  else destination:=new.destination_curriculum_term_course_id; end if;
  select s.* into slot from public.curriculum_term_course s join public.curriculum_term t on t.id=s.curriculum_term_id
    where s.id=destination and t.curriculum_version_id=(org->>'curriculum_version_id')::uuid for share of s;
  if not found then perform saais_private.fail(409,'Credit destination must belong to the current curriculum.'); end if;
  if source is not null then
    select aa.* into a from public.attempt aa where aa.id=source and aa.student_id=new.student_id for share;
    if not found then perform saais_private.fail(404,'Owned source attempt not found.'); end if;
    if new.units_credited<>a.units_attempted then perform saais_private.fail(400,'Credit units must match the source snapshot.'); end if;
  end if;
  if tg_table_name='elective_mapping' and not slot.is_elective_slot then perform saais_private.fail(409,'Elective mapping requires an elective slot.'); end if;
  if tg_table_name='equivalency_decision' then
    if not saais_private.passed(source) then perform saais_private.fail(409,'Equivalency requires a passed source.'); end if;
    if new.decision_type='discontinued_course_equivalency' then
      if a.units_attempted<slot.nominal_units or not exists(select 1 from public.course c where c.id=slot.course_id and c.status='discontinued') or
        not exists(select 1 from public.curriculum_term_course s join public.curriculum_term t on t.id=s.curriculum_term_id
          join public.curriculum_version v on v.id=t.curriculum_version_id join public.course_offering o on o.course_id=s.course_id
          where o.id=a.course_offering_id and v.id<>(org->>'curriculum_version_id')::uuid and v.status='active'
            and v.effective_start<=(now() at time zone 'Asia/Manila')::date and (v.effective_end is null or v.effective_end>=(now() at time zone 'Asia/Manila')::date)) then
        perform saais_private.fail(409,'Discontinued equivalency requires adequate units and another currently effective source curriculum.'); end if;
    end if;
  end if;
  perform saais_private.credit_available(new.student_id,source,destination,tg_table_name,new.id);
  return new;
end $$;
create trigger elective_credit_guard before insert or update on public.elective_mapping for each row execute function saais_private.credit_guard();
create trigger equivalency_credit_guard before insert or update on public.equivalency_decision for each row execute function saais_private.credit_guard();
create trigger outside_credit_guard before insert or update on public.outside_credit for each row execute function saais_private.credit_guard();

create function saais_private.credits(operation text, params jsonb, body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare student uuid:=(params->>'student_id')::uuid; id uuid:=coalesce(params->>'decision_id',params->>'credit_id')::uuid;
  entity text; before_row jsonb; after_row jsonb; org jsonb; source public.attempt; payload jsonb; revoke boolean:=operation like 'revoke%';
begin
  if operation like '%OutsideCredit' then entity:='outside_credit'; org:=saais_private.student_access(student,array['department_head','admin']);
  elsif operation like '%ElectiveMapping' then entity:='elective_mapping'; org:=saais_private.student_access(student,array['adviser']);
  else entity:='equivalency_decision'; org:=saais_private.student_access(student,array['adviser']); end if;
  if id is not null then
    execute format('select to_jsonb(t) from public.%I t where t.id=$1 and t.student_id=$2 for update',entity) into before_row using id,student;
    if before_row is null then perform saais_private.fail(404,'Student credit decision not found.'); end if;
    if before_row->>'revoked_at' is not null then perform saais_private.fail(409,'This credit has already been revoked.'); end if;
    if (before_row->>'updated_at')::timestamptz<>(body->>'expected_updated_at')::timestamptz then perform saais_private.fail(409,'Credit decision changed. Reload before retrying.'); end if;
  end if;
  if revoke then payload:=jsonb_build_object('revoked_at',clock_timestamp(),'revoked_by',auth.uid(),'revocation_reason',body->>'reason','updated_at',clock_timestamp());
  else
    if entity='outside_credit' then
      payload:=body||jsonb_build_object('student_id',student,'units_credited',body->'units','decided_by',auth.uid());
    else
      select a.* into source from public.attempt a where a.id=(body->>'attempt_id')::uuid and a.student_id=student for update;
      if not found then perform saais_private.fail(404,'Owned source attempt not found.'); end if;
      payload:=(body-'expected_updated_at')||jsonb_build_object('student_id',student,'units_credited',source.units_attempted,'updated_at',clock_timestamp());
      if entity='elective_mapping' then payload:=payload||jsonb_build_object('mapped_by',auth.uid());
      else payload:=payload||jsonb_build_object('decided_by',auth.uid(),'decided_at',clock_timestamp()); end if;
    end if;
  end if;
  after_row:=saais_private.write_row(entity,id,payload);
  perform saais_private.audit(operation,entity,(after_row->>'id')::uuid,before_row,after_row,student,coalesce(body->>'reason',body->>'justification'));
  perform saais_private.notify(case when revoke then 'credit_decision_revoked' else 'credit_decision_recorded' end,
    case when revoke then 'alert' else 'grade' end,
    case when revoke then array[student,(org->>'adviser_id')::uuid] else array[student] end,entity,(after_row->>'id')::uuid,student);
  return after_row;
end $$;
