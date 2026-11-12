create function saais_private.fail(status integer, message text) returns void
language plpgsql set search_path=pg_catalog as $$
begin raise exception using errcode='PT'||status::text, message=message; end $$;

-- Small JSON Schema evaluator for the vocabulary present in the pinned contract.
-- Both HTTP and RPC calls validate the same generated schemas; RPC is not a bypass.
create function saais_private.valid(p_value jsonb, schema jsonb) returns boolean
language plpgsql stable set search_path=pg_catalog,public as $$
declare s jsonb:=schema; t text; k text; v jsonb; n integer; matches integer; ts timestamptz; dt date;
begin
  if s ? '$ref' then
    select document->'schemas'->split_part(s->>'$ref','/',4) into s from saais_private.contract where id;
    if s is null then return false; end if;
  end if;
  if s ? 'const' and p_value is distinct from s->'const' then return false; end if;
  if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') e(element) where element=valid.p_value) then return false; end if;
  if s ? 'allOf' then for v in select * from jsonb_array_elements(s->'allOf') loop
    if not saais_private.valid(p_value,v) then return false; end if; end loop; end if;
  if s ? 'anyOf' or s ? 'oneOf' then
    select count(*) into matches from jsonb_array_elements(coalesce(s->'oneOf',s->'anyOf')) e where saais_private.valid(p_value,e);
    if matches=0 or (s ? 'oneOf' and matches<>1) then return false; end if;
  end if;
  t:=jsonb_typeof(p_value);
  if p_value is null then return false; end if;
  if s ? 'type' and not (
    (jsonb_typeof(s->'type')='string' and (s->>'type'=t or (s->>'type'='integer' and t='number' and (p_value#>>'{}')::numeric=trunc((p_value#>>'{}')::numeric)))) or
    (jsonb_typeof(s->'type')='array' and ((s->'type') ? t or ((s->'type') ? 'integer' and t='number' and (p_value#>>'{}')::numeric=trunc((p_value#>>'{}')::numeric))))
  ) then return false; end if;
  if t='object' then
    if s ? 'required' and exists(select 1 from jsonb_array_elements_text(s->'required') r where not p_value ? r) then return false; end if;
    select count(*) into n from jsonb_object_keys(p_value);
    if s ? 'minProperties' and n<(s->>'minProperties')::int then return false; end if;
    for k,v in select * from jsonb_each(p_value) loop
      if s->'properties' ? k then
        if not saais_private.valid(v,s->'properties'->k) then return false; end if;
      elsif s->'additionalProperties'='false'::jsonb then return false;
      end if;
    end loop;
  elsif t='array' then
    n:=jsonb_array_length(p_value);
    if (s ? 'minItems' and n<(s->>'minItems')::int) or (s ? 'maxItems' and n>(s->>'maxItems')::int) then return false; end if;
    if s->>'uniqueItems'='true' and (select count(distinct e) from jsonb_array_elements(p_value) e)<>n then return false; end if;
    if s ? 'items' then for v in select * from jsonb_array_elements(p_value) loop
      if not saais_private.valid(v,s->'items') then return false; end if; end loop; end if;
  elsif t='string' then
    k:=p_value#>>'{}'; n:=length(k);
    if (s ? 'minLength' and n<(s->>'minLength')::int) or (s ? 'maxLength' and n>(s->>'maxLength')::int) then return false; end if;
    if s ? 'pattern' and k !~ (s->>'pattern') then return false; end if;
    if s->>'format'='uuid' and k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
    if s->>'format'='date' then
      if k !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if; dt:=k::date;
    elsif s->>'format'='date-time' then
      if k !~* '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then return false; end if; ts:=k::timestamptz;
    end if;
  elsif t='number' then
    if (s ? 'minimum' and (p_value#>>'{}')::numeric<(s->>'minimum')::numeric)
      or (s ? 'maximum' and (p_value#>>'{}')::numeric>(s->>'maximum')::numeric)
      or (s ? 'exclusiveMinimum' and (p_value#>>'{}')::numeric<=(s->>'exclusiveMinimum')::numeric)
      or (s ? 'multipleOf' and mod((p_value#>>'{}')::numeric,(s->>'multipleOf')::numeric)<>0) then return false; end if;
  end if;
  return true;
exception when data_exception then return false;
end $$;

create function saais_private.actor() returns uuid
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or not exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=actor and (s.not_after is null or s.not_after>now())) then
    perform saais_private.fail(401,'A current user session is required.'); end if;
  if not exists(select 1 from public.profile p where p.id=actor and p.status='active') then
    perform saais_private.fail(403,'An active provisioned profile is required.'); end if;
  return actor;
end $$;
create function saais_private.has_role(wanted text, department uuid default null, faculty uuid default null) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.role_assignment r where r.profile_id=auth.uid() and r.role::text=wanted
    and (department is null or r.department_id=department) and (faculty is null or r.faculty_id=faculty)
    and exists(select 1 from public.profile p where p.id=r.profile_id and p.status='active'));
$$;
create function saais_private.require_scope(roles text[], department uuid default null, faculty uuid default null) returns void
language plpgsql set search_path=pg_catalog,public as $$
declare permitted text;
begin
  select r into permitted from unnest(roles) r where saais_private.has_role(r,case when r in ('department_head','department_staff') then department end,case when r='dean' then faculty end)
    order by (r='admin') desc,array_position(roles,r) limit 1;
  if permitted is null then
    perform saais_private.fail(403,'The requested record is outside your authorized scope.'); end if;
  perform set_config('saais.authorized_role',permitted,true);
end $$;
create function saais_private.organization(student uuid) returns jsonb
language sql stable set search_path=pg_catalog,public as $$
 select jsonb_build_object('student_id',a.student_id,'student_curriculum_assignment_id',a.id,
   'curriculum_version_id',v.id,'program_id',p.id,'department_id',d.id,'faculty_id',d.faculty_id,
   'adviser_id',(select aa.adviser_id from public.adviser_assignment aa where aa.student_id=student and aa.end_date is null),
   'entry_year',(select pr.entry_year from public.profile pr where pr.id=student))
 from public.student_curriculum_assignment a join public.curriculum_version v on v.id=a.curriculum_version_id
 join public.program p on p.id=v.program_id join public.department d on d.id=p.department_id
 where a.student_id=student and a.end_date is null;
$$;
create function saais_private.student_access(student uuid, roles text[], historical boolean default false) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare org jsonb;
begin
  perform 1 from public.profile p where p.id=student and exists(select 1 from public.role_assignment r where r.profile_id=p.id and r.role='student') for update;
  if not found then perform saais_private.fail(404,'Student not found.'); end if;
  org:=saais_private.organization(student);
  if org is null then perform saais_private.fail(409,'Student has no current curriculum assignment.'); end if;
  if 'adviser'=any(roles) and saais_private.has_role('adviser') and exists(
    select 1 from public.adviser_assignment a where a.student_id=student and a.adviser_id=auth.uid() and (historical or a.end_date is null)
  ) then perform set_config('saais.authorized_role','adviser',true); return org; end if;
  perform saais_private.require_scope(array_remove(roles,'adviser'),(org->>'department_id')::uuid,(org->>'faculty_id')::uuid);
  return org;
end $$;
create function saais_private.audit(action text, entity text, id uuid, old_value jsonb, new_value jsonb, student uuid default null, reason text default null) returns void
language plpgsql set search_path=pg_catalog,public as $$
#variable_conflict use_variable
begin
  insert into public.audit_log_entry(actor_id,actor_name,actor_role,student_id,action,action_category,entity_type,entity_id,old_value,new_value,reason)
  select auth.uid(),p.full_name,coalesce(nullif(current_setting('saais.authorized_role',true),'')::public.role_type,
    (select r.role from public.role_assignment r where r.profile_id=auth.uid() order by (r.role='admin') desc,r.created_at,r.id limit 1)),
    student,action,case when student is null then 'catalog_term' else 'change' end,entity,id,old_value,new_value,reason from public.profile p where p.id=auth.uid();
  if student is not null then insert into saais_private.cache_invalidation(student_id) values(student)
    on conflict(student_id) do update set revision=cache_invalidation.revision+1,updated_at=clock_timestamp(); end if;
end $$;
create function saais_private.notify(event text, kind text, recipients uuid[], entity text, id uuid, student uuid default null) returns void
language sql set search_path=pg_catalog,public as $$
  insert into public.notification(recipient_id,event_type,kind,title,body,actor_id,entity_type,entity_id,target_student_id,email_delivery_status)
  select distinct p.id,event,kind,replace(initcap(replace(event,'_',' ')),'  ',' '),'An academic record was updated.',auth.uid(),entity,notify.id,student,'pending'
  from public.profile p where p.id=any(recipients) and p.status='active';
$$;
create function saais_private.recipients(department uuid, roles text[]) returns uuid[]
language sql stable set search_path=pg_catalog,public as $$
  select coalesce(array_agg(distinct r.profile_id),'{}'::uuid[]) from public.role_assignment r
  left join public.department d on d.id=department where r.role::text=any(roles)
    and (r.role='admin' or (r.role='dean' and r.faculty_id=d.faculty_id) or r.department_id=department);
$$;
create function saais_private.credit_snapshot() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
  insert into saais_private.credit_history(entity_type,entity_id,student_id,value,valid_from,valid_until)
  values(tg_table_name,old.id,old.student_id,to_jsonb(old),old.updated_at,new.updated_at);
  return new;
end $$;
create trigger elective_mapping_history before update on public.elective_mapping for each row execute function saais_private.credit_snapshot();
create trigger equivalency_history before update on public.equivalency_decision for each row execute function saais_private.credit_snapshot();
create trigger outside_credit_history before update on public.outside_credit for each row execute function saais_private.credit_snapshot();
-- Only helpers can access private state. Execute privileges are tightened again
-- after all later migrations have created their routines.
revoke all on all functions in schema saais_private from public,anon,authenticated;
