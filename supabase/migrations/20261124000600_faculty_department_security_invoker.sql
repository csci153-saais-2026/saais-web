-- Publish only the leadership names already returned by the catalog views;
-- do not grant catalog readers access to the leaders' profile records.
create function saais_private.catalog_leader_name(p_role text, p_scope uuid) returns text
language sql stable security definer set search_path = pg_catalog as $$
  select left(p.full_name, 150)
  from public.role_assignment a join public.profile p on p.id = a.profile_id
  where saais_private.own_active_record(auth.uid()) and p.status = 'active'
    and ((p_role = 'dean' and a.role = 'dean' and a.faculty_id = p_scope)
      or (p_role = 'department_head' and a.role = 'department_head' and a.department_id = p_scope))
  order by a.created_at, a.id limit 1;
$$;
revoke all on function saais_private.catalog_leader_name(text, uuid) from public, anon, authenticated;
grant execute on function saais_private.catalog_leader_name(text, uuid) to authenticated;

grant select (id, code, name, letterhead_prefix, letterhead_name) on public.faculty to authenticated;
grant select (id, faculty_id, code, name, letterhead_prefix, letterhead_name) on public.department to authenticated;
create policy api_faculty_read on public.faculty for select to authenticated using (saais_private.own_active_record(auth.uid()));
create policy api_department_read on public.department for select to authenticated using (saais_private.own_active_record(auth.uid()));

create or replace view saais_api.faculty with (security_barrier = true, security_invoker = true) as
select r.id, r.code, r.name, r.letterhead_prefix, r.letterhead_name,
  saais_private.catalog_leader_name('dean', r.id) as dean_name
from public.faculty r where saais_private.own_active_record(auth.uid());

create or replace view saais_api.department with (security_barrier = true, security_invoker = true) as
select r.id, r.faculty_id, r.code, r.name, r.letterhead_prefix, r.letterhead_name,
  saais_private.catalog_leader_name('department_head', r.id) as department_head_name,
  saais_private.catalog_leader_name('dean', r.faculty_id) as dean_name
from public.department r where saais_private.own_active_record(auth.uid());
