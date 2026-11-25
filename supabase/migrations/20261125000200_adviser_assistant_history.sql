-- Each current adviser has a private conversation for each assigned student.
-- The browser can read only its own currently authorized history; only the
-- trusted Edge Function may append a completed question/answer pair.
create table saais_private.adviser_assistant_history (
  adviser_id uuid not null references public.profile(id) on delete cascade,
  student_id uuid not null references public.profile(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (adviser_id, student_id),
  constraint adviser_assistant_history_bounded check (
    jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 20
  )
);
revoke all on saais_private.adviser_assistant_history from public, anon, authenticated;

create function saais_private.assert_assistant_adviser(p_adviser uuid, p_student uuid)
returns void language plpgsql stable security definer set search_path=pg_catalog as $$
begin
  if p_adviser is null or p_student is null or not exists (
    select 1 from public.profile p join public.role_assignment r on r.profile_id=p.id
    where p.id=p_adviser and p.status='active' and r.role='adviser'
  ) or not exists (
    select 1 from public.adviser_assignment a join public.profile s on s.id=a.student_id
    where a.adviser_id=p_adviser and a.student_id=p_student and s.status <> 'disabled'
      and a.start_date <= (statement_timestamp() at time zone 'Asia/Manila')::date and a.end_date is null
      and exists (select 1 from public.role_assignment sr where sr.profile_id=s.id and sr.role='student')
  ) then
    perform saais_private.fail(403, 'This student is outside your adviser assignment.');
  end if;
end $$;
revoke all on function saais_private.assert_assistant_adviser(uuid, uuid) from public, anon, authenticated;

create function public.saais_get_assistant_history(p_student_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
declare caller uuid := saais_private.actor(); result jsonb;
begin
  perform saais_private.require_scope(array['adviser']);
  perform saais_private.assert_assistant_adviser(caller, p_student_id);
  select h.messages into result from saais_private.adviser_assistant_history h
    where h.adviser_id=caller and h.student_id=p_student_id;
  return coalesce(result, '[]'::jsonb);
end $$;
revoke all on function public.saais_get_assistant_history(uuid) from public, anon, authenticated;
grant execute on function public.saais_get_assistant_history(uuid) to authenticated;

create function public.saais_record_assistant_turn(
  p_adviser_id uuid, p_student_id uuid, p_question text, p_answer text
) returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform pg_advisory_xact_lock(531201, 1);
  perform saais_private.assert_assistant_adviser(p_adviser_id, p_student_id);
  if p_question is null or length(p_question) not between 1 and 4000 or btrim(p_question) = ''
    or p_answer is null or length(p_answer) not between 1 and 8000 or btrim(p_answer) = '' then
    perform saais_private.fail(400, 'Invalid assistant conversation.');
  end if;
  insert into saais_private.adviser_assistant_history(adviser_id, student_id, messages)
    values(p_adviser_id, p_student_id, jsonb_build_array(
      jsonb_build_object('role','user','content',p_question),
      jsonb_build_object('role','assistant','content',p_answer)))
  on conflict(adviser_id, student_id) do update set
    messages=(select coalesce(jsonb_agg(item.value order by item.ordinality), '[]'::jsonb)
      from jsonb_array_elements(adviser_assistant_history.messages || excluded.messages)
        with ordinality item(value, ordinality)
      where item.ordinality > greatest(jsonb_array_length(adviser_assistant_history.messages || excluded.messages) - 20, 0)),
    updated_at=clock_timestamp();
end $$;
revoke all on function public.saais_record_assistant_turn(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.saais_record_assistant_turn(uuid, uuid, text, text) to service_role;

-- The assistant requires the current adviser assignment at context retrieval.
create or replace function public.matt_assistant_context(p_student_id uuid, p_body jsonb) returns jsonb
language plpgsql security definer
set search_path = pg_catalog
set statement_timeout = '8s'
as $$
declare
  caller uuid := saais_private.actor();
  query_schema jsonb;
  organization jsonb;
  summary jsonb;
  recent jsonb;
  curriculum jsonb;
  available_terms jsonb;
  curriculum_id uuid;
  now_at timestamptz := clock_timestamp();
  project uuid := '00000000-0000-0000-0000-000000000000';
  accepted integer;
  context_result jsonb;
begin
  perform 1 from public.profile p where p.id = caller for share;
  perform 1 from public.role_assignment r where r.profile_id = caller for share;
  perform 1 from auth.sessions s where s.id::text = auth.jwt()->>'session_id' and s.user_id = caller for share;
  caller := saais_private.actor();
  perform saais_private.require_scope(array['adviser']);
  if p_student_id is null or p_body is null or jsonb_typeof(p_body) <> 'object'
    or octet_length(p_body::text) > 1048576 then
    perform saais_private.fail(400, 'The assistant question and conversation exceed the input budget.');
  end if;
  select operation->'input' into query_schema
  from saais_private.matt_contract c
  cross join lateral jsonb_array_elements(c.document->'operations') operation
  where operation->>'id' = 'askAdvisingAssistant';
  if query_schema is null or not saais_private.valid(p_body - 'history', query_schema)
    or (case when p_body ? 'history' then
      case when jsonb_typeof(p_body->'history') = 'array'
        then jsonb_array_length(p_body->'history') > 20 else true end
      else false end) then
    perform saais_private.fail(400, 'Request does not match the assistant schema.');
  end if;
  if not exists (select 1 from public.profile p where p.id = p_student_id and p.status <> 'disabled'
    and exists (select 1 from public.role_assignment r where r.profile_id = p.id and r.role = 'student')) then
    perform saais_private.fail(404, 'Student not found.');
  end if;
  if not exists (
    select 1 from public.adviser_assignment a where a.student_id = p_student_id and a.adviser_id = caller
      and a.start_date <= (now_at at time zone 'Asia/Manila')::date and a.end_date is null
  ) then
    perform saais_private.fail(403, 'This student is outside your adviser assignment.');
  end if;
  organization := saais_private.organization(p_student_id);
  if organization is null then
    perform saais_private.fail(409, 'Student has no current curriculum assignment.');
  end if;

  curriculum_id := (organization->>'curriculum_version_id')::uuid;
  summary := saais_private.matt_student_summary(
    p_student_id, (organization->>'curriculum_version_id')::uuid, (organization->>'department_id')::uuid
  );
  select coalesce(jsonb_agg(to_jsonb(row) order by chronological_key desc, course_code), '[]') into recent
  from (
    select a.chronological_key, left(a.term_label, 100) as academic_term, left(c.code, 100) as course_code,
      a.effective_status, a.gwa_grade, recorded.midterm_status, recorded.midterm_grade,
      recorded.final_grade, a.units_attempted, a.is_lapsed_inc
    from saais_private.matt_effective_attempts(p_student_id) a join public.course c on c.id = a.course_id
    join public.attempt recorded on recorded.id = a.attempt_id
    order by a.chronological_key desc, c.code, a.attempt_id limit 100
  ) row;
  -- Use the same scoped checklist and prerequisite data as the advising workflow.
  -- The limits are explicit in the payload so the model cannot mistake a
  -- truncated curriculum, grade history, or offering list for a complete one.
  select jsonb_build_object(
    'version', left(v.version_label, 100),
    'program', left(p.name, 150),
    'total_units', v.total_units,
    'courses_truncated', (select count(*) > 250 from public.curriculum_term_course s
      join public.curriculum_term t on t.id = s.curriculum_term_id where t.curriculum_version_id = curriculum_id),
    'courses', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.year_level, item.term_sequence, item.course_code, item.slot_label)
      from (
        select t.year_level, t.term_sequence, left(c.code, 100) as course_code,
          left(c.title, 200) as course_title, left(s.slot_label, 150) as slot_label,
          s.is_elective_slot, s.nominal_units, cs.status as recorded_status,
          coalesce((select jsonb_agg(jsonb_build_object('course_code', left(pc.code,100),
            'course_title', left(pc.title,200), 'type', pr.type) order by pc.code)
            from public.prerequisite pr join public.course pc on pc.id=pr.prerequisite_course_id
            where pr.course_id=c.id), '[]'::jsonb) as prerequisites
        from public.curriculum_term t
        join public.curriculum_term_course s on s.curriculum_term_id=t.id
        left join public.course c on c.id=s.course_id
        left join saais_private.matt_checklist_slots(p_student_id, curriculum_id) cs on cs.slot_id=s.id
        where t.curriculum_version_id=curriculum_id
        order by t.year_level, t.term_sequence, c.code, s.slot_label, s.id limit 250
      ) item
    ), '[]'::jsonb)
  ) into curriculum
  from public.curriculum_version v join public.program p on p.id=v.program_id
  where v.id=curriculum_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'school_year', item.school_year, 'term_type', item.term_type,
    'ends_on', item.ends_on, 'is_locked', item.is_locked,
    'offerings_truncated', item.offerings_truncated, 'offered_courses', item.offerings
  ) order by item.chronological_key), '[]'::jsonb) into available_terms
  from (
    select t.school_year, t.term_type, t.ends_on, t.is_locked, t.chronological_key,
      (select count(*) > 200 from public.course_offering o join public.course c on c.id=o.course_id
        where o.school_term_id=t.id and c.status='active') as offerings_truncated,
      coalesce((select jsonb_agg(to_jsonb(offered) order by offered.course_code)
        from (select left(c.code,100) as course_code, left(c.title,200) as course_title,
          c.units, o.is_by_request from public.course_offering o join public.course c on c.id=o.course_id
          where o.school_term_id=t.id and c.status='active' order by c.code, o.id limit 200) offered), '[]'::jsonb) as offerings
    from public.school_term t where t.ends_on >= (now_at at time zone 'Asia/Manila')::date
    order by t.chronological_key limit 8
  ) item;

  -- No student names, identifiers, account details, notes or raw records leave the database.
  context_result := jsonb_build_object(
    'grounded_at', now_at, 'request', jsonb_build_object(
      'message', p_body->>'message', 'history', public.saais_get_assistant_history(p_student_id)),
    'record', jsonb_build_object(
      'gwa', summary->'gwa', 'standing', summary->'standing', 'earned_units', summary->'earned_units',
      'required_units', summary->'required_units', 'open_inc_count', summary->'open_inc_count',
      'lapsed_inc_count', summary->'lapsed_inc_count', 'recent_effective_attempts', recent,
      'attempts_truncated', (select count(*) > 100 from saais_private.matt_effective_attempts(p_student_id)),
      'curriculum', curriculum, 'available_terms', available_terms,
      'terms_truncated', (select count(*) > 8 from public.school_term t
        where t.ends_on >= (now_at at time zone 'Asia/Manila')::date)
    )
  );

  -- These counters are reserved before context leaves PostgreSQL. A failed
  -- provider call consumes its reservation, and clients cannot reset limits.
  with reservations as (
    insert into saais_private.matt_assistant_budget(actor_id, window_type, window_start, request_count)
    values (caller, 'minute', date_trunc('minute', now_at), 1),
      (caller, 'day', date_trunc('day', now_at, 'UTC'), 1),
      (project, 'project_day', date_trunc('day', now_at, 'UTC'), 1)
    on conflict (actor_id, window_type, window_start) do update
    set request_count = matt_assistant_budget.request_count + 1
    where matt_assistant_budget.request_count < case excluded.window_type when 'minute' then 5 when 'day' then 50 else 300 end
    returning 1
  )
  select count(*) into accepted from reservations;
  if accepted <> 3 then perform saais_private.fail(429, 'The advising assistant request budget is exhausted.'); end if;

  return context_result;
end
$$;

revoke all on function public.matt_assistant_context(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.matt_assistant_context(uuid, jsonb) to authenticated;
