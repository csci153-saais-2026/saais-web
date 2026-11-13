-- The transaction closes one assignment and opens its successor. Check the
-- final history so the two writes can share a date without leaving a gap.
create function saais_private.matt_check_adviser_continuity() returns trigger
language plpgsql set search_path = pg_catalog as $$
declare
  student uuid := case when tg_op = 'DELETE' then old.student_id else new.student_id end;
begin
  if tg_op = 'UPDATE' and new.student_id <> old.student_id then
    perform saais_private.fail(409, 'An assignment cannot be moved to another student.');
  end if;

  perform 1 from public.profile p where p.id = student for update;
  if not exists (
    select 1 from public.adviser_assignment a where a.student_id = student and a.end_date is null
  ) or exists (
    select 1 from (
      select a.end_date, lead(a.start_date) over (order by a.start_date, a.id) as next_start
      from public.adviser_assignment a where a.student_id = student
    ) history where history.end_date is distinct from history.next_start
  ) then
    perform saais_private.fail(409, 'Adviser assignments must form a continuous history with one current adviser.');
  end if;
  return null;
end;
$$;

create constraint trigger matt_adviser_assignment_continuity
after insert or update or delete on public.adviser_assignment
deferrable initially deferred for each row
execute function saais_private.matt_check_adviser_continuity();

create function saais_private.matt_adviser_assignment_payload(p_id uuid) returns jsonb
language sql stable set search_path = pg_catalog as $$
  select jsonb_build_object(
    'id', a.id,
    'adviser_id', a.adviser_id,
    'adviser_name', adviser.full_name,
    'adviser_email', adviser.email,
    'adviser_faculty_name', faculty.name,
    'adviser_consultation_hours', to_jsonb(adviser)->>'consultation_hours',
    'student_id', a.student_id,
    'start_date', a.start_date,
    'end_date', a.end_date,
    'handed_over_to_adviser_id', handover.id,
    'handed_over_to_name', handover.full_name,
    'handover_label', case when handover.id is not null
      then left('Handed over to ' || handover.full_name || ' (' || to_char(a.end_date, 'Mon YYYY') || ')', 200) end,
    'created_at', a.created_at
  )
  from public.adviser_assignment a
  join public.profile adviser on adviser.id = a.adviser_id
  left join public.department adviser_department on adviser_department.id = adviser.department_id
  left join public.faculty faculty on faculty.id = coalesce(adviser.faculty_id, adviser_department.faculty_id)
  left join public.adviser_assignment successor on successor.student_id = a.student_id and successor.start_date = a.end_date
  left join public.profile handover on handover.id = successor.adviser_id
  where a.id = p_id;
$$;

create function saais_private.matt_reassign_adviser(
  p_student_ids uuid[], p_adviser_id uuid, p_effective_date date, p_reason text, p_operation text
) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  student uuid;
  org jsonb;
  department uuid;
  faculty uuid;
  outgoing public.adviser_assignment%rowtype;
  incoming public.adviser_assignment%rowtype;
  adviser public.profile%rowtype;
  assignments jsonb := '[]';
begin
  perform saais_private.actor();
  perform saais_private.require_scope(array['department_head','department_staff']);
  if p_effective_date > (now() at time zone 'Asia/Manila')::date then
    perform saais_private.fail(400, 'Choose an effective date on or before today.');
  end if;

  -- Match the profile-first lock used by curriculum transfers and grades.
  -- Sorting every affected profile also serializes overlapping bulk writes.
  perform 1 from public.profile p
  where p.id = any(p_student_ids || p_adviser_id) order by p.id for update;
  select p.* into adviser from public.profile p where p.id = p_adviser_id;
  if not found then perform saais_private.fail(404, 'Adviser not found.'); end if;

  foreach student in array p_student_ids loop
    org := saais_private.student_access(student, array['department_head','department_staff']);
    department := (org->>'department_id')::uuid;
    faculty := (org->>'faculty_id')::uuid;

    -- An adviser role scoped to the faculty alone needs a matching profile
    -- department. Faculty membership alone never authorizes this assignment.
    if adviser.status <> 'active' or adviser.id = student or not exists (
      select 1 from public.role_assignment r
      where r.profile_id = adviser.id and r.role = 'adviser' and r.faculty_id = faculty
        and (r.department_id = department or (r.department_id is null and adviser.department_id = department))
    ) then
      raise exception using errcode = 'PT409', detail = 'INVALID_ADVISER',
        message = 'Choose an eligible active adviser in the student''s department.';
    end if;

    select a.* into outgoing from public.adviser_assignment a
    where a.student_id = student and a.end_date is null for update;
    if not found or outgoing.adviser_id = adviser.id or p_effective_date <= outgoing.start_date then
      raise exception using errcode = 'PT409', detail = 'INVALID_ASSIGNMENT',
        message = 'An active assignment, a different adviser, and a date after the current start date are required.';
    end if;

    update public.adviser_assignment set end_date = p_effective_date where id = outgoing.id;
    insert into public.adviser_assignment (adviser_id, student_id, start_date, reason)
    values (adviser.id, student, p_effective_date, p_reason) returning * into incoming;

    perform saais_private.audit(
      p_operation, 'adviser_assignment', incoming.id,
      to_jsonb(outgoing), to_jsonb(incoming), student, p_reason
    );
    perform saais_private.notify('adviser_assigned', 'person', array[student, adviser.id],
      'adviser_assignment', incoming.id, student);
    perform saais_private.notify('adviser_reassigned_away', 'person', array[outgoing.adviser_id],
      'adviser_assignment', outgoing.id, student);

    if p_operation = 'reassignAdviser' then
      return jsonb_build_array(
        saais_private.matt_adviser_assignment_payload(outgoing.id),
        saais_private.matt_adviser_assignment_payload(incoming.id)
      );
    end if;
    assignments := assignments || jsonb_build_array(saais_private.matt_adviser_assignment_payload(incoming.id));
  end loop;

  return jsonb_build_object('reassigned_count', jsonb_array_length(assignments), 'assignments', assignments);
end;
$$;

create function saais_private.matt_reassignadviser(p_params jsonb, p_body jsonb) returns jsonb
language sql set search_path = pg_catalog as $$
  select saais_private.matt_reassign_adviser(
    array[(p_params->>'student_id')::uuid], (p_body->>'adviser_id')::uuid,
    (p_body->>'start_date')::date, p_body->>'reason', 'reassignAdviser'
  );
$$;

create function saais_private.matt_bulkreassignadvisers(p_params jsonb, p_body jsonb) returns jsonb
language sql set search_path = pg_catalog as $$
  select saais_private.matt_reassign_adviser(
    array(select value::uuid from jsonb_array_elements_text(p_body->'student_ids') with ordinality order by ordinality),
    (p_body->>'adviser_id')::uuid, (p_body->>'effective_since')::date, p_body->>'reason', 'bulkReassignAdvisers'
  );
$$;

revoke all on function saais_private.matt_check_adviser_continuity(),
  saais_private.matt_adviser_assignment_payload(uuid),
  saais_private.matt_reassign_adviser(uuid[], uuid, date, text, text),
  saais_private.matt_reassignadviser(jsonb, jsonb),
  saais_private.matt_bulkreassignadvisers(jsonb, jsonb) from public, anon, authenticated;
