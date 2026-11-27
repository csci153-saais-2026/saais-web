-- A historical adviser can read a former advisee's profile but not the
-- role_assignment view, whose scope is deliberately current-only.
create function saais_private.profile_role_list(p_profile uuid) returns public.role_type[]
language sql stable security definer set search_path = pg_catalog as $$
  select array(select distinct a.role from public.role_assignment a
    where a.profile_id = p_profile order by a.role)
  where saais_private.can_read_profile(p_profile, true);
$$;
revoke all on function saais_private.profile_role_list(uuid) from public, anon, authenticated;
grant execute on function saais_private.profile_role_list(uuid) to authenticated;

create policy api_profile_read on public.profile for select to authenticated
  using (saais_private.can_read_profile(id, true));
create or replace view saais_api.profile with (security_barrier = true, security_invoker = true) as
select r.id, r.role, saais_private.profile_role_list(r.id) as roles,
  r.email, r.full_name, r.student_number, r.status,
  saais_private.current_invitation_status(r.invitation_status, r.invitation_expires_at) as invitation_status,
  r.invitation_sent_at, r.invitation_expires_at, r.created_at, r.updated_at, r.faculty_id,
  r.department_id, r.avatar_url, r.consultation_hours
from public.profile r where saais_private.can_read_profile(r.id, true);
