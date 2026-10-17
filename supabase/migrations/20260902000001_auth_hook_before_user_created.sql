create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  matched_profile record;
begin
  user_email := event->'user'->>'email';

  if user_email is null or trim(user_email) = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Sign-in was rejected: An email address is required for institutional sign-in.'
      )
    );
  end if;

  select id, status, role
  into matched_profile
  from public.profile
  where lower(email) = lower(trim(user_email))
  limit 1;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Sign-in was rejected: Your email (' || user_email || ') is not a registered institutional profile. Please contact your department administrator to provision access.'
      )
    );
  end if;

  if matched_profile.status = 'disabled' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Sign-in was rejected: Your institutional account has been deactivated. Please contact your department administrator.'
      )
    );
  end if;

  return event;
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;
