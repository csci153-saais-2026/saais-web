do $$
#variable_conflict use_variable
declare student uuid:='00000005-0000-4000-8000-000000000000'; department uuid; other uuid; course uuid; result jsonb; operation jsonb; path_params jsonb;
begin
  select (value->>'id')::uuid into department from test.records where name='department';
  select (value->>'id')::uuid into other from test.records where name='department_b';
  select (value->>'id')::uuid into course from test.records where name='course';
  perform test.login(2);
  perform test.expect('PT403','createCourse','{}',jsonb_build_object('department_id',other,'code','DENY101','title','Forbidden Course','units',3));
  perform test.expect('PT403','createFaculty','{}','{"name":"Forbidden Faculty"}');
  perform test.expect('PT403','createProgram','{}',jsonb_build_object('department_id',department,'code','DENY','name','Forbidden Program','nominal_duration',4));
  perform test.login(6);
  perform test.expect('PT403','updateCourse',jsonb_build_object('id',course),'{"title":"Forbidden edit"}');
  perform test.login(10);
  perform test.expect('PT403','createFaculty','{}','{"name":"Disabled user"}');
  perform test.login(1);
  update auth.sessions set not_after=now()-interval '1 minute' where user_id=auth.uid();
  perform test.expect('PT401','createFaculty','{}','{"name":"Expired session"}');
  update auth.sessions set not_after=null where user_id=auth.uid();
  -- Every assigned request rejects spoofed path properties at the database
  -- boundary, independently of the Edge Function router.
  for operation in select * from jsonb_array_elements((select document->'operations' from saais_private.contract)) loop
    perform test.assert(exists(select 1 from test.coverage c where c.operation=operation->>'id'),'missing successful SQL coverage: '||(operation->>'id'));
    perform test.login(case when operation->'roles' ? 'admin' then 1 else 4 end);
    perform test.expect('PT400',operation->>'id','{"spoofed_actor":"untrusted"}');
    select coalesce(jsonb_object_agg(p->>'name','ffffffff-0000-4000-8000-000000000000'),'{}') into path_params from jsonb_array_elements(operation->'parameters') p;
    perform test.expect('PT400',operation->>'id',path_params,'{"spoofed_actor":"untrusted"}');
    if operation->'input'<>'null'::jsonb and not saais_private.valid('{}',operation->'input') then perform test.expect('PT400',operation->>'id',path_params,'{}'); end if;
    perform test.login(5);
    if not operation->'roles' ? 'student' then perform test.expect('PT403',operation->>'id'); end if;
    perform set_config('request.jwt.claims','{}',true);
    perform test.expect('PT401',operation->>'id');
  end loop;
  perform test.login(1);
  perform test.assert((select count(*)=47 from test.coverage),'expected 47 covered operations');
  perform test.assert(not has_function_privilege('anon','public.jerome_operation(text,jsonb,jsonb)','EXECUTE'),'anonymous RPC grant');
  perform test.assert(not has_function_privilege('authenticated','saais_private.catalog(text,jsonb,jsonb)','EXECUTE'),'private RPC bypass');
  perform test.assert(not has_table_privilege('authenticated','public.course','INSERT'),'raw course writes');
  perform test.assert(not has_table_privilege('authenticated','public.audit_log_entry','UPDATE'),'audit write grants');
  perform test.assert(not has_table_privilege('authenticated','public.elective_mapping','UPDATE'),'raw credit writes');
  perform test.assert(not has_table_privilege('authenticated','saais_private.contract','UPDATE'),'request schema write grants');
  begin update public.audit_log_entry set reason='tamper'; raise exception 'mutable audit'; exception when sqlstate 'PT403' then null; end;
  begin truncate public.audit_log_entry; raise exception 'audit truncation allowed'; exception when sqlstate 'PT403' then null; end;
  begin truncate saais_private.credit_history; raise exception 'credit history truncation allowed'; exception when sqlstate 'PT403' then null; end;
  perform test.login(7);
  perform test.expect('PT403','updateCourse',jsonb_build_object('id',course),'{"title":"Dean cannot edit"}');
  insert into public.role_assignment(profile_id,role,department_id) values(auth.uid(),'department_head',department);
  perform test.call('updateCourse',jsonb_build_object('id',course),'{"title":"Multi-role department edit"}');
  perform test.assert((select a.actor_role='department_head' from public.audit_log_entry a where a.actor_id=auth.uid() and a.action='updateCourse' order by a.created_at desc,a.id limit 1),'audit used an unrelated primary role');
  perform test.expect('PT403','createCourse','{}',jsonb_build_object('department_id',other,'code','DENY2','title','Other faculty','units',3));
  perform test.login(1);
  insert into saais_private.request_budget(actor_id,window_start,count) values(auth.uid(),date_trunc('minute',now()),120)
    on conflict(actor_id,window_start) do update set count=120;
  perform test.expect('PT429','createFaculty','{}','{"name":"Rate limited faculty"}');
  delete from saais_private.request_budget where actor_id=auth.uid();
end$$;
select test.login(5);
set local role authenticated;
do $$begin
  if exists(select 1 from public.notification where recipient_id<>auth.uid()) then raise exception 'notification RLS leak'; end if;
  if exists(select 1 from public.role_assignment where profile_id<>auth.uid()) then raise exception 'role RLS leak'; end if;
  begin insert into public.course(department_id,code,title,units) values(gen_random_uuid(),'SPOOF','Spoof',3); raise exception 'raw insert allowed'; exception when insufficient_privilege then null; end;
  begin perform saais_private.catalog('createFaculty','{}','{"name":"Spoof"}'); raise exception 'private helper allowed'; exception when insufficient_privilege then null; end;
  perform public.jerome_operation('markNotificationsRead','{}','{"mark_all":true}');
end$$;
reset role;
set local role anon;
do $$begin
  begin perform public.jerome_operation('markNotificationsRead','{}','{"mark_all":true}'); raise exception 'anon RPC allowed'; exception when insufficient_privilege then null; end;
end$$;
reset role;
