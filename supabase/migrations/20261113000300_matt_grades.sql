alter table public.attempt
  add column midterm_status text check (midterm_status in ('graded', 'dr')),
  add column instructor text check (length(instructor) <= 150),
  add column prerequisite_override boolean not null default false,
  add column prerequisite_grade_override boolean not null default false,
  add constraint attempt_midterm_dr_requires_drop check (
    midterm_status is distinct from 'dr' or (status = 'dr' and midterm_grade is null)
  );

create table public.grade_flag (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  attempt_id uuid not null,
  reported_stage text check (reported_stage in ('midterm', 'final')),
  reported_grade_text text check (length(reported_grade_text) <= 64),
  issue_type text not null check (issue_type in (
    'wrong_grade', 'incorrect_grade', 'missing_grade', 'wrong_course_credited',
    'wrong_status', 'missing_completion', 'other'
  )),
  details text not null check (length(details) <= 2000 and details ~ '\S'),
  status text not null default 'open' check (status in ('open', 'corrected', 'rejected')),
  resolution_action text check (resolution_action in ('correct', 'reject')),
  corrected_grade numeric check (corrected_grade between 1 and 5 and mod(corrected_grade * 4, 1) = 0),
  corrected_status public.attempt_status,
  resolution_note text check (length(resolution_note) <= 2000 and resolution_note ~ '\S'),
  resolved_by uuid references public.profile(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (attempt_id, student_id) references public.attempt(id, student_id) on delete restrict,
  check (
    (status = 'open' and resolution_action is null and resolved_by is null and resolved_at is null)
    or (resolved_by is not null and resolved_at is not null and resolution_note is not null and
      ((status = 'corrected' and resolution_action is not distinct from 'correct') or
       (status = 'rejected' and resolution_action is not distinct from 'reject')))
  )
);
create index grade_flag_student_status_idx on public.grade_flag(student_id, status);
create index grade_flag_attempt_idx on public.grade_flag(attempt_id);
alter table public.grade_flag enable row level security;
revoke all on public.grade_flag from anon, authenticated;

create function saais_private.matt_grade_conflict(p_code text, p_message text) returns void
language plpgsql set search_path = pg_catalog as $$
begin
  raise exception using errcode = 'PT409', message = p_message, detail = p_code;
end
$$;

-- The profile lock serializes changes in ownership, curriculum and student credits.
-- An open assignment may be scheduled. Compare against the institutional date.
create function saais_private.matt_grade_student(p_student_id uuid, p_historical boolean default false) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_today date := (statement_timestamp() at time zone 'Asia/Manila')::date;
  v_actor uuid := saais_private.actor();
  v_org jsonb;
begin
  perform saais_private.require_scope(array['adviser']);
  perform 1 from public.profile p where p.id = p_student_id and exists (
    select 1 from public.role_assignment r where r.profile_id = p.id and r.role = 'student'
  ) for update;
  if not found then
    perform saais_private.fail(404, 'Student not found.');
  end if;
  if not exists (
    select 1 from public.adviser_assignment a
    where a.student_id = p_student_id and a.adviser_id = v_actor and a.start_date <= v_today
      and (p_historical or a.end_date is null or a.end_date > v_today)
  ) then
    perform saais_private.fail(403, 'This student is outside your adviser assignment.');
  end if;

  v_org := saais_private.organization(p_student_id);
  if v_org is null then
    perform saais_private.fail(409, 'The student has no current curriculum assignment.');
  end if;
  return v_org;
end
$$;

create function saais_private.matt_grade_open_term(p_term_id uuid, p_department_id uuid) returns public.school_term
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_term public.school_term;
begin
  -- Jerome's term writer locks this row before touching a closure, including new ones.
  select t.* into v_term from public.school_term t where t.id = p_term_id for share;
  if not found then
    perform saais_private.fail(404, 'School term not found.');
  end if;
  if exists (
    select 1 from public.department_term_encoding d
    where d.school_term_id = p_term_id and d.department_id = p_department_id and d.is_closed
  ) then
    perform saais_private.matt_grade_conflict('TERM_LOCKED', 'Grade encoding is closed for this department and term.');
  end if;
  if v_term.is_locked and not v_term.override_flag then
    perform saais_private.matt_grade_conflict('TERM_LOCKED', 'This school term is locked.');
  end if;
  return v_term;
end
$$;

create function saais_private.matt_grade_attempt(p_student_id uuid, p_attempt_id uuid) returns public.attempt
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_attempt public.attempt;
begin
  select a.* into v_attempt
  from public.attempt a where a.id = p_attempt_id and a.student_id = p_student_id
  for update;
  if not found then
    perform saais_private.fail(404, 'Student attempt not found.');
  end if;
  return v_attempt;
end
$$;

create function saais_private.matt_inc_change(
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
begin
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
      set completion_grade = (p_body->>'completion_grade')::numeric,
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
      p_student_id, p_attempt_id, (p_body->>'completion_grade')::numeric,
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

create function saais_private.matt_completeinc(p_params jsonb, p_body jsonb) returns jsonb
language sql set search_path = pg_catalog, public as $$
  select saais_private.matt_inc_change(
    (p_params->>'student_id')::uuid, (p_params->>'attempt_id')::uuid, p_body, false
  );
$$;

create function saais_private.matt_correctinccompletion(p_params jsonb, p_body jsonb) returns jsonb
language sql set search_path = pg_catalog, public as $$
  select saais_private.matt_inc_change(
    (p_params->>'student_id')::uuid, (p_params->>'attempt_id')::uuid, p_body, true
  );
$$;

create function saais_private.matt_remove_attempt(p_attempt public.attempt) returns void
language plpgsql set search_path = pg_catalog, public as $$
begin
  if exists (select 1 from public.inc_resolution i where i.attempt_id = p_attempt.id)
      or exists (select 1 from public.elective_mapping m where m.attempt_id = p_attempt.id)
      or exists (select 1 from public.equivalency_decision e where e.attempt_id = p_attempt.id)
      or exists (select 1 from public.grade_flag f where f.attempt_id = p_attempt.id)
      or exists (select 1 from public.attempt_remark r where r.attempt_id = p_attempt.id) then
    perform saais_private.matt_grade_conflict('ATTEMPT_IN_USE', 'Dependent academic records prevent deleting this attempt.');
  end if;
  delete from public.attempt a where a.id = p_attempt.id;
  perform saais_private.audit('deleteOpenTermAttempt', 'attempt', p_attempt.id,
    to_jsonb(p_attempt), null, p_attempt.student_id);
end
$$;

create function saais_private.matt_deleteopentermattempt(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_org jsonb := saais_private.matt_grade_student(v_student_id);
  v_attempt public.attempt := saais_private.matt_grade_attempt(v_student_id, (p_params->>'attempt_id')::uuid);
  v_term_id uuid;
begin
  select o.school_term_id into v_term_id from public.course_offering o where o.id = v_attempt.course_offering_id;
  perform saais_private.matt_grade_open_term(v_term_id, (v_org->>'department_id')::uuid);
  perform saais_private.matt_remove_attempt(v_attempt);
  return null;
end
$$;
