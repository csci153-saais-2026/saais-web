create function saais_private.can_read_audit(p_student uuid, p_actor uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select saais_private.can_read_student(p_student, array['adviser','department_head','dean','admin'])
    or (p_student is null and saais_private.own_active_record(p_actor) and exists (
      select 1 from public.role_assignment a where a.profile_id = auth.uid()
        and a.role in ('adviser','department_head','dean')));
$$;
create function saais_private.audit_display(p_entry uuid)
returns table(student_name text, student_number text, target_label text, old_value jsonb, new_value jsonb)
language sql stable security definer set search_path = pg_catalog as $$
  select left(s.full_name, 150), s.student_number,
    left(nullif(concat_ws(' · ', s.student_number, s.full_name), ''), 250),
    case when saais_private.can_read_department(null, array['admin']) then r.old_value end,
    case when saais_private.can_read_department(null, array['admin']) then r.new_value end
  from public.audit_log_entry r left join public.profile s on s.id = r.student_id
  where r.id = p_entry and saais_private.can_read_audit(r.student_id, r.actor_id);
$$;
revoke all on function saais_private.can_read_audit(uuid, uuid), saais_private.audit_display(uuid) from public, anon, authenticated;
grant execute on function saais_private.can_read_audit(uuid, uuid), saais_private.audit_display(uuid) to authenticated;

-- The old/new values remain unavailable on the underlying table. The helper
-- returns them only to administrators and returns names only for scoped entries.
grant select (id, actor_id, actor_name, actor_role, student_id, action, action_category,
  entity_type, entity_id, reason, created_at) on public.audit_log_entry to authenticated;
create policy api_audit_read on public.audit_log_entry for select to authenticated
  using (saais_private.can_read_audit(student_id, actor_id));
create or replace view saais_api.audit_log_entry with (security_barrier = true, security_invoker = true) as
select r.id, r.actor_id, r.actor_name, r.actor_role, r.student_id, display.student_name,
  display.student_number, display.target_label, r.action, r.action_category, r.entity_type, r.entity_id,
  left(coalesce(r.reason, r.action), 1000) as details_summary,
  display.old_value, display.new_value, r.reason, r.created_at
from public.audit_log_entry r cross join lateral saais_private.audit_display(r.id) display
where saais_private.can_read_audit(r.student_id, r.actor_id);
