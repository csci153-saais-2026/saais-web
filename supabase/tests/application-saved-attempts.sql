begin;

create function test.attempt_history_state(p_attempt_id uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'attempt', (select to_jsonb(a) from public.attempt a where a.id = p_attempt_id),
    'attempts', (select count(*) from public.attempt),
    'audits', (select count(*) from public.audit_log_entry),
    'notifications', (select count(*) from public.notification),
    'flags', (select count(*) from public.grade_flag),
    'resolutions', (select count(*) from public.inc_resolution),
    'elective_mappings', (select count(*) from public.elective_mapping),
    'equivalency_decisions', (select count(*) from public.equivalency_decision)
  );
$$;

create function test.expect_attempt_rejected(
  p_status text, p_operation text, p_params jsonb, p_body jsonb, p_attempt_id uuid
) returns void language plpgsql as $$
declare
  before_state jsonb := test.attempt_history_state(p_attempt_id);
  caught boolean := false;
begin
  begin
    perform public.matt_operation(p_operation, p_params, p_body);
  exception when others then
    if sqlstate <> p_status then
      raise exception 'Expected %, got %: % for %', p_status, sqlstate, sqlerrm, p_operation;
    end if;
    caught := true;
  end;
  perform test.assert(caught, 'Saved-attempt removal was accepted.');
  perform test.assert(test.attempt_history_state(p_attempt_id) = before_state,
    'Rejected attempt removal changed academic records, audit history, or notifications.');
end;
$$;

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  admin uuid := '00000001-0000-4000-8000-000000000000';
  department uuid := (saais_private.organization(student)->>'department_id')::uuid;
  course uuid := (select (value->>'id')::uuid from test.records where name = 'source_course');
  term uuid;
  offering uuid;
  saved public.attempt;
  params jsonb;
  encoding_body jsonb;
  encoding_state integer;
  attempt_state public.attempt_status;
begin
  insert into public.school_term(start_year, end_year, term_type, starts_on, ends_on, encoding_deadline)
    values(2098, 2099, '1st Semester', '2098-08-01', '2098-12-01', '2099-01-01') returning id into term;
  insert into public.course_offering(school_term_id, course_id, section)
    values(term, course, 'SAVED-HISTORY') returning id into offering;
  insert into public.attempt(student_id, course_offering_id, status, units_attempted, created_by, updated_by)
    values(student, offering, 'currently_enrolled', 3, adviser, adviser) returning * into saved;
  params := jsonb_build_object('student_id', student, 'attempt_id', saved.id);
  encoding_body := jsonb_build_object(
    'school_term_id', term, 'rows', '[]'::jsonb, 'remove_attempt_ids', jsonb_build_array(saved.id)
  );

  perform test.login(4);
  for encoding_state in 0..3 loop
    update public.school_term set is_locked = encoding_state in (1, 3),
      override_flag = encoding_state = 3,
      override_actor_id = case when encoding_state = 3 then admin end,
      override_at = case when encoding_state = 3 then now() end where id = term;
    insert into public.department_term_encoding(school_term_id, department_id, is_closed)
      values(term, department, encoding_state = 2)
      on conflict(school_term_id, department_id) do update set is_closed = excluded.is_closed;

    foreach attempt_state in array enum_range(null::public.attempt_status) loop
      update public.attempt set status = attempt_state,
        final_grade = case attempt_state when 'passed' then 2 when 'failed' then 5 end,
        inc_deadline = case when attempt_state = 'inc' then '2099-12-01'::date end
        where id = saved.id;
      perform test.expect_attempt_rejected('PT409', 'deleteOpenTermAttempt', params, '{}', saved.id);
    end loop;
  end loop;

  -- The encoding endpoint must not provide an alternate deletion path.
  update public.school_term set is_locked = false, override_flag = false,
    override_actor_id = null, override_at = null where id = term;
  update public.department_term_encoding set is_closed = false where school_term_id = term;
  perform test.expect_attempt_rejected('PT409', 'encodeTermGrades',
    jsonb_build_object('student_id', student), encoding_body, saved.id);

  perform test.login(8);
  perform test.expect_attempt_rejected('PT403', 'deleteOpenTermAttempt', params, '{}', saved.id);
  perform test.login(5);
  perform test.expect_attempt_rejected('PT403', 'deleteOpenTermAttempt', params, '{}', saved.id);
  perform test.login(1);
  perform test.expect_attempt_rejected('PT403', 'deleteOpenTermAttempt', params, '{}', saved.id);
  perform test.login(4);
  perform test.expect_attempt_rejected('PT404', 'deleteOpenTermAttempt',
    params || '{"attempt_id":"ffffffff-0000-4000-8000-000000000000"}', '{}', saved.id);
  perform set_config('request.jwt.claims', '{}', true);
  perform test.expect_attempt_rejected('PT401', 'deleteOpenTermAttempt', params, '{}', saved.id);
end;
$$;

rollback;
