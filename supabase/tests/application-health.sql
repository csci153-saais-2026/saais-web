select test.login(1);
set local role authenticated;
do $$
begin
  if public.matt_operation('getHealthStatus') is distinct from '{"status":"ok"}'::jsonb then
    raise exception 'Authenticated health check failed';
  end if;
  begin
    perform public.matt_operation('getHealthStatus','{"unexpected":true}');
    raise exception 'Unexpected query parameter was accepted';
  exception when sqlstate 'PT400' then null;
  end;
end $$;
reset role;
insert into auth.users(id) values ('00000099-0000-4000-8000-000000000000');
insert into auth.sessions(id,user_id) values ('00000099-0000-4000-8000-000000000001','00000099-0000-4000-8000-000000000000');
select test.login(99);
do $$
begin
  begin
    perform public.matt_operation('getHealthStatus');
    raise exception 'Unprovisioned account was accepted';
  exception when sqlstate 'PT403' then null;
  end;
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.matt_operation('getHealthStatus');
    raise exception 'Unauthenticated account was accepted';
  exception when sqlstate 'PT401' then null;
  end;
end $$;
