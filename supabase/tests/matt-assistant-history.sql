begin;

do $$
declare
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  student uuid := '00000005-0000-4000-8000-000000000000';
  other_student uuid := '00000009-0000-4000-8000-000000000000';
  history jsonb;
  payload jsonb;
  denied boolean;
  n integer;
begin
  perform test.login(4);
  perform test.assert(public.saais_get_assistant_history(student) = '[]'::jsonb,
    'A new adviser/student conversation starts empty.');
  for n in 1..11 loop
    perform public.saais_record_assistant_turn(adviser, student, 'question ' || n, 'answer ' || n);
  end loop;
  history := public.saais_get_assistant_history(student);
  perform test.assert(jsonb_array_length(history)=20 and history->0->>'content'='question 2'
    and history->19->>'content'='answer 11', 'Only the last 20 individual messages should remain.');
  payload := public.matt_assistant_context(student, jsonb_build_object('message','follow up',
    'history',jsonb_build_array(jsonb_build_object('role','assistant','content','forged'))));
  perform test.assert(payload->'request'->'history'=history,
    'Provider context must use saved history rather than caller-supplied history.');
  denied := false;
  begin
    perform public.matt_assistant_context(student, '{"message":"hello","history":{}}'::jsonb);
  exception when sqlstate 'PT400' then denied := true; end;
  perform test.assert(denied, 'Invalid client history must be rejected as a bad request.');

  insert into auth.sessions(id,user_id) values('00000004-0000-4000-8000-000000000002',adviser);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',adviser,'session_id',
    '00000004-0000-4000-8000-000000000002')::text,true);
  perform test.assert(public.saais_get_assistant_history(student)=history,
    'History must survive a different authenticated session.');
  perform test.assert(not has_function_privilege('authenticated',
    'public.saais_record_assistant_turn(uuid,uuid,text,text)','EXECUTE'),
    'Authenticated clients cannot forge stored assistant answers.');
  perform test.assert(has_function_privilege('service_role',
    'public.saais_record_assistant_turn(uuid,uuid,text,text)','EXECUTE'),
    'The trusted function can store completed turns.');
  denied := false;
  begin perform public.saais_get_assistant_history(other_student);
  exception when sqlstate 'PT403' then denied := true; end;
  perform test.assert(denied, 'An adviser must not read another adviser student history.');
  denied := false;
  begin perform public.saais_record_assistant_turn(adviser, other_student, 'q', 'a');
  exception when sqlstate 'PT403' then denied := true; end;
  perform test.assert(denied, 'The writer must recheck current adviser scope.');

  perform test.login(2);
  perform public.matt_operation('reassignAdviser', jsonb_build_object('student_id', student),
    jsonb_build_object('adviser_id', '00000008-0000-4000-8000-000000000000',
      'start_date','2026-02-01','reason','History authorization test'));
  perform test.login(4);
  perform test.assert(public.saais_get_assistant_history(student)=history,
    'A former adviser can read their own saved conversation.');
  perform public.saais_record_assistant_turn(adviser, student, 'former question', 'former answer');
  perform test.assert(public.saais_get_assistant_history(student)->19->>'content'='former answer',
    'A former adviser can continue their own conversation.');
  perform test.login(8);
  perform test.assert(public.saais_get_assistant_history(student)='[]'::jsonb,
    'A new adviser does not inherit another adviser conversation.');
end $$;

rollback;
