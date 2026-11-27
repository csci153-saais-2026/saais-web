-- Supabase Auth invokes this before a new auth.users row exists. A committed
-- provisioning reservation is the pre-registration authority; the profile is
-- written only after the matching Auth identity has been created.
create function public.saais_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  v_email text := lower(btrim(event->'user'->>'email'));
  reservation_id text := event->'user'->'app_metadata'->>'saais_provisioning_id';
begin
  if v_email is null or v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@vsu[.]edu[.]ph$'
    or reservation_id is null
    or not exists (
      select 1 from saais_private.invite_reservation r
      where r.id::text = reservation_id and r.email = v_email and r.profile_id is null
    ) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'This institutional account is not pre-registered. Contact your department administrator.'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.saais_before_user_created(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.saais_before_user_created(jsonb) to supabase_auth_admin;
