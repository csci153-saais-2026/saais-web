-- Some hosted projects have this dashboard-created event-trigger function.
-- It does not need to be executable by Data API roles to run as a trigger.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    if not exists (select 1 from pg_catalog.pg_proc p
      where p.oid = to_regprocedure('public.rls_auto_enable()')
        and p.prorettype = 'pg_catalog.event_trigger'::regtype) then
      raise exception 'Unexpected public.rls_auto_enable() signature; inspect before revoking';
    end if;
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
