do $$
declare
  browser_role text;
  refused boolean;
begin
  perform set_config('request.path', '/', true);
  perform set_config('request.method', 'GET', true);
  perform set_config('request.headers', '{}', true);

  foreach browser_role in array array['anon', 'authenticated'] loop
    refused := false;
    perform set_config('role', browser_role, true);
    begin
      perform public.saais_check_data_api_request();
    exception when sqlstate 'PT403' then
      refused := true;
    end;
    perform set_config('role', 'none', true);
    perform test.assert(refused, browser_role || ' cannot read the Data API root');
  end loop;

  perform set_config('role', 'service_role', true);
  perform public.saais_check_data_api_request();
  perform set_config('role', 'none', true);
end $$;
