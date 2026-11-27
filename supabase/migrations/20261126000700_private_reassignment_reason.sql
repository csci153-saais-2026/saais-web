-- The direct table cannot expose unredacted reasons to API roles. Return the
-- scoped reason through a definer function, preserving authorized management access.
create function saais_private.audit_reason(p_entry uuid) returns text
language sql stable security definer set search_path = pg_catalog as $$
  select case
    when r.entity_type = 'adviser_assignment'
      and r.action in ('reassignAdviser', 'bulkReassignAdvisers')
      and not saais_private.can_read_student(r.student_id, array['department_head','dean','admin'])
    then null else r.reason end
  from public.audit_log_entry r
  where r.id = p_entry and saais_private.can_read_audit(r.student_id, r.actor_id);
$$;
revoke all on function saais_private.audit_reason(uuid) from public, anon, authenticated;
grant execute on function saais_private.audit_reason(uuid) to authenticated;
revoke select (reason) on public.audit_log_entry from authenticated;
create or replace view saais_api.audit_log_entry with (security_barrier = true, security_invoker = true) as
select r.id, r.actor_id, r.actor_name, r.actor_role, r.student_id, display.student_name,
  display.student_number, display.target_label, r.action, r.action_category, r.entity_type, r.entity_id,
  left(coalesce(reason.value, r.action), 1000) as details_summary,
  display.old_value, display.new_value, reason.value as reason, r.created_at
from public.audit_log_entry r
cross join lateral saais_private.audit_display(r.id) display
cross join lateral (select saais_private.audit_reason(r.id) as value) reason
where saais_private.can_read_audit(r.student_id, r.actor_id);
