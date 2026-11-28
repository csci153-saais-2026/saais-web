-- #202: the PostgREST root lists exposed tables, columns and functions, so browser
-- roles may no longer skip the gateway guard to read it. Roles other than anon and
-- authenticated (including service_role) still return early.
create or replace function public.saais_check_data_api_request() returns void
language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  path text := current_setting('request.path', true);
  method text := current_setting('request.method', true);
  headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  proof text := headers->>'x-saais-data-api-key';
begin
  if current_setting('role', true) not in ('anon', 'authenticated')
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
notify pgrst, 'reload config';
