create function saais_private.school_terms(operation text, params jsonb, body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare term_id uuid:=(params->>'school_term_id')::uuid; department uuid:=(body->>'department_id')::uuid;
  scope text:=coalesce(body->>'scope','department'); before_row jsonb; after_row jsonb; closure jsonb; recipients uuid[]; choices integer;
begin
  select to_jsonb(t) into before_row from public.school_term t where t.id=term_id for update;
  if before_row is null then perform saais_private.fail(404,'School term not found.'); end if;
  if operation='setSchoolTermOverride' then
    perform saais_private.require_scope(array['admin']);
    update public.school_term t set override_flag=(body->>'enabled')::boolean,override_actor_id=auth.uid(),override_at=clock_timestamp()
      where t.id=term_id returning to_jsonb(t) into after_row;
    select array_agg(distinct r.profile_id) into recipients from public.role_assignment r where r.role in ('adviser','department_head','admin');
    perform saais_private.notify('term_override_toggled','alert',recipients,'school_term',term_id);
  else
    if scope='institution' then
      if operation='reopenDepartmentTermEncoding' then perform saais_private.fail(403,'Department reopening cannot lift the institution lock.'); end if;
      perform saais_private.require_scope(array['admin']);
      if department is not null then perform saais_private.fail(400,'Institution scope does not accept a department.'); end if;
      update public.school_term t set is_locked=true,closed_by=auth.uid(),closed_at=clock_timestamp(),closure_note=body->>'closure_note'
        where t.id=term_id returning to_jsonb(t) into after_row;
      select array_agg(distinct r.profile_id) into recipients from public.role_assignment r where r.role in ('adviser','department_staff','department_head','dean');
    else
      if department is null then
        if saais_private.has_role('admin') then perform saais_private.fail(400,'Admin must specify the target department.'); end if;
        select count(distinct r.department_id),(array_agg(distinct r.department_id))[1] into choices,department from public.role_assignment r
          where r.profile_id=auth.uid() and r.role in ('department_head','department_staff');
        if choices<>1 then perform saais_private.fail(400,'Specify one of your assigned departments.'); end if;
      end if;
      perform saais_private.require_scope(array['admin','department_head','department_staff'],department);
      perform 1 from public.department d where d.id=department for share;
      if not found then perform saais_private.fail(404,'Department not found.'); end if;
      select to_jsonb(c) into closure from public.department_term_encoding c where c.school_term_id=term_id and c.department_id=department for update;
      if operation='reopenDepartmentTermEncoding' then
        if closure is null then perform saais_private.fail(409,'The department has no encoding closure to reopen.'); end if;
        update public.department_term_encoding c set is_closed=false,updated_at=clock_timestamp(),closure_note=body->>'closure_note'
          where c.school_term_id=term_id and c.department_id=department returning to_jsonb(c) into after_row;
      else
        insert into public.department_term_encoding(school_term_id,department_id,is_closed,closed_by,closed_at,closure_note)
          values(term_id,department,true,auth.uid(),clock_timestamp(),body->>'closure_note')
          on conflict(school_term_id,department_id) do update set is_closed=true,closed_by=auth.uid(),closed_at=clock_timestamp(),closure_note=excluded.closure_note,updated_at=clock_timestamp();
        after_row:=before_row;
      end if;
      recipients:=saais_private.recipients(department,array['adviser','department_staff','department_head','dean']);
    end if;
    if operation='closeSchoolTermEncoding' then perform saais_private.notify('term_encoding_closed','alert',recipients,'school_term',term_id); end if;
  end if;
  perform saais_private.audit(operation,case when operation='reopenDepartmentTermEncoding' then 'department_term_encoding' else 'school_term' end,
    case when operation='reopenDepartmentTermEncoding' then (after_row->>'id')::uuid else term_id end,
    coalesce(closure,before_row),after_row,null,body->>'closure_note');
  if operation<>'reopenDepartmentTermEncoding' then
    select after_row||jsonb_build_object('department_closures',coalesce(jsonb_agg(to_jsonb(c)),'[]')) into after_row
      from public.department_term_encoding c where c.school_term_id=term_id and
        (saais_private.has_role('admin') or saais_private.has_role('department_head',c.department_id) or saais_private.has_role('department_staff',c.department_id));
  end if;
  return after_row;
end $$;
