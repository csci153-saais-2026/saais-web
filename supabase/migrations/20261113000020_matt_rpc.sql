create function public.matt_operation(p_operation text, p_params jsonb default '{}', p_body jsonb default '{}')
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
set statement_timeout = '20s'
as $$
declare
  op jsonb;
  parameter jsonb;
  param_schema jsonb := '{"type":"object","properties":{},"required":[],"additionalProperties":false}';
  actor_id uuid;
  permitted text;
  budget integer;
  result jsonb;
  routine text;
  excluded_count integer;
begin
  actor_id := saais_private.actor();
  select entry into op
    from saais_private.matt_contract c cross join lateral jsonb_array_elements(c.document->'operations') entry
    where entry->>'id'=p_operation and not (entry->>'public')::boolean;
  if op is null then perform saais_private.fail(404,'Operation not found.'); end if;
  routine := 'matt_' || lower(op->>'id');
  if to_regprocedure(format('saais_private.%I(jsonb,jsonb)',routine)) is null then
    perform saais_private.fail(404,'Operation not found.');
  end if;

  -- Match the transaction lock order used by the other backend writers.
  if op->>'method' <> 'GET' then perform pg_advisory_xact_lock(531201,1); end if;
  perform 1 from public.profile where id=actor_id for share;
  perform 1 from public.role_assignment where profile_id=actor_id for share;
  perform 1 from auth.sessions where id::text=auth.jwt()->>'session_id' and user_id=actor_id for share;
  actor_id := saais_private.actor();
  select r into permitted from jsonb_array_elements_text(op->'roles') r
    where saais_private.has_role(r) order by (r='admin') desc,r limit 1;
  if permitted is null then perform saais_private.fail(403,'Your assigned roles do not permit this operation.'); end if;
  perform set_config('saais.authorized_role',permitted,true);

  if p_body is null or p_params is null or octet_length(p_body::text)>1048576 or octet_length(p_params::text)>8192 then
    perform saais_private.fail(400,'Request exceeds the server size limit or has invalid input.');
  end if;
  for parameter in select * from jsonb_array_elements(op->'parameters') loop
    param_schema := jsonb_set(param_schema,array['properties',parameter->>'name'],parameter->'schema');
    if parameter->>'required'='true' then
      param_schema := jsonb_set(param_schema,'{required}',param_schema->'required'||jsonb_build_array(parameter->>'name'));
    end if;
  end loop;
  if not saais_private.valid(p_params,param_schema) or
    (op->'input'<>'null'::jsonb and not (op->>'bodyRequired'='false' and p_body='{}'::jsonb)
      and not saais_private.valid(p_body,op->'input')) or
    (op->'input'='null'::jsonb and p_body<>'{}'::jsonb) then
    perform saais_private.fail(400,'Request does not match the assigned API schema.');
  end if;
  insert into saais_private.request_budget(actor_id,window_start,count)
    values(actor_id,date_trunc('minute',now()),1)
    on conflict on constraint request_budget_pkey do update set count=request_budget.count+1 returning count into budget;
  if budget>120 then perform saais_private.fail(429,'Request budget exceeded. Retry after 60 seconds.'); end if;

  execute format('select saais_private.%I($1,$2)',routine) into result using p_params,p_body;
  if op->>'status'='204' then return null; end if;
  if p_operation='listRecommendations' then
    excluded_count := (result->>'excluded_count')::integer;
    result := result->'rows';
  end if;
  result := saais_private.project(result,op->'output');
  if not saais_private.valid(result,op->'output') then
    perform saais_private.fail(500,'The operation produced an invalid resource.');
  end if;
  if p_operation='listRecommendations' then
    return jsonb_build_object('rows',result,'excluded_count',excluded_count);
  end if;
  return result;
exception
  when unique_violation then perform saais_private.fail(409,'A record with this identity already exists.');
  when foreign_key_violation then perform saais_private.fail(409,'Referenced records must exist and their history must be preserved.');
  when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
    perform saais_private.fail(400,'The request violates a data constraint.');
  when serialization_failure or deadlock_detected then
    perform saais_private.fail(409,'The record changed concurrently. Reload before retrying.');
end
$$;

revoke all on function public.matt_operation(text,jsonb,jsonb) from public, anon;
grant execute on function public.matt_operation(text,jsonb,jsonb) to authenticated;

create function saais_private.matt_gethealthstatus(p_params jsonb,p_body jsonb)
returns jsonb language sql immutable set search_path = pg_catalog as $$
  select jsonb_build_object('status','ok');
$$;
