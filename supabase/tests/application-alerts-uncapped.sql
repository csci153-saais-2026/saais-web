-- Run inside the test runner transaction; replace candidate source with a
-- deterministic large set so the cron path proves it does not drop row 501.
create or replace function saais_private.alert_candidates(reference_date date, department uuid)
returns table(event text,recipients uuid[],entity text,entity_id uuid,student uuid,dedupe text,title text)
language sql stable set search_path=pg_catalog as $$
  select 'inc_lapsed', array['00000005-0000-4000-8000-000000000000'::uuid],
    'attempt', md5(n::text)::uuid, null::uuid, 'large-alert-test:'||n, 'Large alert test'
  from generate_series(1, 501) n;
$$;
do $$
declare first_run jsonb; retry jsonb;
begin
  first_run := saais_private.scheduled_alerts();
  retry := saais_private.scheduled_alerts();
  perform test.assert((first_run->>'total_created')::integer=501, 'All due alerts are inserted beyond 500');
  perform test.assert((retry->>'total_created')::integer=0, 'Repeated cron runs are deduplicated');
end $$;
