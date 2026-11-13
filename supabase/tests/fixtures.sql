create schema test;
create table test.coverage(operation text primary key);
create table test.records(name text primary key, value jsonb not null);
create function test.assert(ok boolean, message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception '%',message; end if; end$$;
create function test.login(person integer) returns void language plpgsql as $$begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',lpad(person::text,8,'0')||'-0000-4000-8000-000000000000','session_id',lpad(person::text,8,'0')||'-0000-4000-8000-000000000001')::text,true);
end$$;
create function test.call(operation text, params jsonb default '{}', body jsonb default '{}') returns jsonb language plpgsql as $$
declare result jsonb; begin result:=public.jerome_operation(operation,params,body); insert into test.coverage values(operation) on conflict do nothing; return result; end$$;
create function test.expect(status text, operation text, params jsonb default '{}', body jsonb default '{}') returns void language plpgsql as $$
declare caught boolean:=false; begin
  begin perform public.jerome_operation(operation,params,body); exception when others then
    if sqlstate<>status then raise exception 'Expected %, got %: % for %',status,sqlstate,sqlerrm,operation; end if; caught:=true;
  end;
  if not caught then raise exception 'Expected rejection for %',operation; end if;
end$$;
insert into auth.users(id) select (lpad(i::text,8,'0')||'-0000-4000-8000-000000000000')::uuid from generate_series(1,10) i;
insert into auth.sessions(id,user_id) select (lpad(i::text,8,'0')||'-0000-4000-8000-000000000001')::uuid,(lpad(i::text,8,'0')||'-0000-4000-8000-000000000000')::uuid from generate_series(1,10) i;
insert into public.profile(id,role,email,full_name,status) values('00000001-0000-4000-8000-000000000000','admin','admin@example.test','Test Admin','active');
insert into public.role_assignment(profile_id,role) values('00000001-0000-4000-8000-000000000000','admin');
select test.login(1);
