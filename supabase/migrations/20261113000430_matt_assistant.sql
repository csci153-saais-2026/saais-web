create table saais_private.matt_assistant_budget (
  actor_id uuid not null,
  window_type text not null check (window_type in ('minute', 'day', 'project_day')),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (actor_id, window_type, window_start)
);
revoke all on saais_private.matt_assistant_budget from public, anon, authenticated;

create function public.matt_assistant_context(p_student_id uuid, p_body jsonb) returns jsonb
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
  now_at timestamptz := clock_timestamp();
  project uuid := '00000000-0000-0000-0000-000000000000';
  accepted integer;
begin
  perform 1 from public.profile p where p.id = caller for share;
  perform 1 from public.role_assignment r where r.profile_id = caller for share;
  perform 1 from auth.sessions s where s.id::text = auth.jwt()->>'session_id' and s.user_id = caller for share;
  caller := saais_private.actor();
  perform saais_private.require_scope(array['adviser']);
  if p_student_id is null or p_body is null or octet_length(p_body::text) > 12000 then
    perform saais_private.fail(400, 'The assistant question and conversation exceed the input budget.');
  end if;
  select operation->'input' into query_schema
  from saais_private.matt_contract c
  cross join lateral jsonb_array_elements(c.document->'operations') operation
  where operation->>'id' = 'askAdvisingAssistant';
  if query_schema is null or not saais_private.valid(p_body, query_schema) then
    perform saais_private.fail(400, 'Request does not match the assistant schema.');
  end if;
  if not exists (select 1 from public.profile p where p.id = p_student_id and p.status <> 'disabled'
    and exists (select 1 from public.role_assignment r where r.profile_id = p.id and r.role = 'student')) then
    perform saais_private.fail(404, 'Student not found.');
  end if;
  if not exists (
    select 1 from public.adviser_assignment a where a.student_id = p_student_id and a.adviser_id = caller
      and a.start_date <= (now_at at time zone 'Asia/Manila')::date
  ) then
    perform saais_private.fail(403, 'This student is outside your adviser assignment.');
  end if;
  organization := saais_private.organization(p_student_id);
  if organization is null then
    perform saais_private.fail(409, 'Student has no current curriculum assignment.');
  end if;

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

  summary := saais_private.matt_student_summary(
    p_student_id, (organization->>'curriculum_version_id')::uuid, (organization->>'department_id')::uuid
  );
  select coalesce(jsonb_agg(to_jsonb(row) order by chronological_key desc, course_code), '[]') into recent
  from (
    select a.chronological_key, left(a.term_label, 100) as academic_term, left(c.code, 100) as course_code,
      a.effective_status, a.gwa_grade, a.units_attempted, a.is_lapsed_inc
    from saais_private.matt_effective_attempts(p_student_id) a join public.course c on c.id = a.course_id
    order by a.chronological_key desc, c.code, a.attempt_id limit 20
  ) row;
  -- The provider receives academic facts, without student names, identifiers,
  -- account details, free-form notes/remarks, staff-only audit or raw records.
  return jsonb_build_object(
    'grounded_at', now_at, 'request', p_body,
    'record', jsonb_build_object(
      'gwa', summary->'gwa', 'standing', summary->'standing', 'earned_units', summary->'earned_units',
      'required_units', summary->'required_units', 'open_inc_count', summary->'open_inc_count',
      'lapsed_inc_count', summary->'lapsed_inc_count', 'recent_effective_attempts', recent
    )
  );
end
$$;

revoke all on function public.matt_assistant_context(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.matt_assistant_context(uuid, jsonb) to authenticated;
