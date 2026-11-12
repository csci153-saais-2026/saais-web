create function saais_private.project(payload jsonb, schema jsonb) returns jsonb
language plpgsql stable set search_path=pg_catalog,public as $$
declare s jsonb:=schema; k text; v jsonb; result jsonb;
begin
  if s ? '$ref' then select document->'schemas'->split_part(s->>'$ref','/',4) into s from saais_private.contract where id; end if;
  if jsonb_typeof(payload)='object' and s ? 'properties' then
    result:='{}';
    for k,v in select * from jsonb_each(payload) loop
      if s->'properties' ? k then result:=result||jsonb_build_object(k,saais_private.project(v,s->'properties'->k)); end if;
    end loop;
    return result;
  elsif jsonb_typeof(payload)='array' and s ? 'items' then
    select coalesce(jsonb_agg(saais_private.project(e,s->'items')),'[]') into result from jsonb_array_elements(payload) e;
    return result;
  end if;
  return payload;
end $$;

create function public.jerome_operation(p_operation text, p_params jsonb default '{}', p_body jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog,public set statement_timeout='20s' as $$
declare operation jsonb; result jsonb; parameter jsonb; param_schema jsonb:='{"type":"object","properties":{},"required":[],"additionalProperties":false}';
  actor uuid; budget integer; permitted text;
begin
  actor:=saais_private.actor();
  -- Recheck provisioned roles from locked records, never user_metadata.
  perform 1 from public.profile p where p.id=actor for share;
  perform 1 from public.role_assignment r where r.profile_id=actor for share;
  perform 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=actor for share;
  actor:=saais_private.actor();
  select o into operation from saais_private.contract c cross join lateral jsonb_array_elements(c.document->'operations') o where o->>'id'=p_operation;
  if operation is null then perform saais_private.fail(404,'Operation not found.'); end if;
  if not exists(select 1 from jsonb_array_elements_text(operation->'roles') r where saais_private.has_role(r)) then
    perform saais_private.fail(403,'Your assigned roles do not permit this operation.'); end if;
  select r into permitted from jsonb_array_elements_text(operation->'roles') r where saais_private.has_role(r) order by (r='admin') desc,r limit 1;
  perform set_config('saais.authorized_role',permitted,true);
  if octet_length(p_body::text)>1048576 or octet_length(p_params::text)>8192 then perform saais_private.fail(400,'Request exceeds the server size limit.'); end if;
  for parameter in select * from jsonb_array_elements(operation->'parameters') loop
    param_schema:=jsonb_set(param_schema,array['properties',parameter->>'name'],parameter->'schema');
    param_schema:=jsonb_set(param_schema,'{required}',(param_schema->'required')||jsonb_build_array(parameter->>'name'));
  end loop;
  if not saais_private.valid(p_params,param_schema) or
    (operation->'input'<>'null'::jsonb and not saais_private.valid(p_body,operation->'input')) or
    (operation->'input'='null'::jsonb and p_body<>'{}'::jsonb) then perform saais_private.fail(400,'Request does not match the assigned API schema.'); end if;
  -- Consistent lock order across Jerome mutations. Student writers also lock the
  -- profile row; Matt's grade/assignment routines must follow that same protocol.
  perform pg_advisory_xact_lock(531201,1);
  insert into saais_private.request_budget(actor_id,window_start,count) values(actor,date_trunc('minute',now()),1)
    on conflict(actor_id,window_start) do update set count=request_budget.count+1 returning count into budget;
  if budget>120 then perform saais_private.fail(429,'Request budget exceeded. Retry after 60 seconds.'); end if;
  if operation->>'path' like '/functions/v1/catalog/%' then result:=saais_private.catalog(p_operation,p_params,p_body);
  elsif operation->>'path' like '/functions/v1/school-terms/%' then result:=saais_private.school_terms(p_operation,p_params,p_body);
  elsif operation->>'path' like '/functions/v1/notifications/%' then result:=saais_private.notifications(p_operation,p_body);
  else result:=saais_private.students(p_operation,p_params,p_body); end if;
  if (operation->>'status')::int=204 then return null; end if;
  result:=saais_private.project(result,operation->'output');
  if not saais_private.valid(result,operation->'output') then perform saais_private.fail(500,'The operation produced an invalid resource.'); end if;
  return result;
exception
  when unique_violation then perform saais_private.fail(409,'A record with this identity already exists.');
  when foreign_key_violation then perform saais_private.fail(409,'Referenced academic records must exist and their history must be preserved.');
  when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow then perform saais_private.fail(400,'The request violates an academic data constraint.');
  when serialization_failure or deadlock_detected then perform saais_private.fail(409,'The academic record changed concurrently. Reload before retrying.');
end $$;
revoke all on function public.jerome_operation(text,jsonb,jsonb) from public,anon;
grant execute on function public.jerome_operation(text,jsonb,jsonb) to authenticated;
revoke all on all functions in schema saais_private from public,anon,authenticated;
