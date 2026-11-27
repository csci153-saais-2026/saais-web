-- The Edge gateway uses a private credential to prove that it checked the query.
-- The forwarded caller JWT still determines the role, grants and row access.
create table saais_private.data_api_gateway_key (
  singleton boolean primary key default true check (singleton),
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
insert into saais_private.data_api_gateway_key default values;
revoke all on table saais_private.data_api_gateway_key from public, anon, authenticated, service_role;

create function public.saais_read_data_api_gateway_key() returns text
language sql stable security definer set search_path = pg_catalog as $$
  select token from saais_private.data_api_gateway_key where singleton;
$$;
revoke all on function public.saais_read_data_api_gateway_key() from public, anon, authenticated;
grant execute on function public.saais_read_data_api_gateway_key() to service_role;

create function public.saais_check_data_api_request() returns void
language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  path text := current_setting('request.path', true);
  method text := current_setting('request.method', true);
  headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  proof text := headers->>'x-saais-data-api-key';
begin
  if current_setting('role', true) not in ('anon', 'authenticated')
    or path = '/'
    or (path like '/rpc/%' and coalesce(
      case when method = 'POST' then headers->>'content-profile' else headers->>'accept-profile' end,
      'public'
    ) = 'public') then
    return;
  end if;
  if method = 'GET'
    and headers->>'accept-profile' = 'saais_api'
    and proof ~ '^[0-9a-f]{64}$'
    and exists (
      select 1 from saais_private.data_api_gateway_key k
      where k.singleton and sha256(convert_to(k.token, 'UTF8')) = sha256(convert_to(proof, 'UTF8'))
    ) then
    return;
  end if;
  raise sqlstate 'PT403' using message = 'Use the SAAIS Data API gateway for collection reads.';
end $$;
revoke all on function public.saais_check_data_api_request() from public;
grant execute on function public.saais_check_data_api_request() to anon, authenticated, service_role;

do $$
begin
  -- The plain PostgreSQL regression harness supplies no PostgREST login role.
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    alter role authenticator set pgrst.db_pre_request = 'public.saais_check_data_api_request';
  end if;
end $$;
notify pgrst, 'reload config';
