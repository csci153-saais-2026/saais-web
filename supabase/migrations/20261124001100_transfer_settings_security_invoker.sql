create function saais_private.can_read_transfer(p_student uuid, p_from uuid, p_to uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select saais_private.can_read_student(p_student, array['student','adviser','department_head','dean','admin'])
    or exists (select 1 from public.curriculum_version v join public.program p on p.id = v.program_id
      where v.id in (p_from, p_to)
        and saais_private.can_read_department(p.department_id, array['department_head','dean']));
$$;
create function saais_private.transfer_names(p_transfer uuid)
returns table(endorsed_by_name text, decided_by_name text)
language sql stable security definer set search_path = pg_catalog as $$
  select left(endorser.full_name, 150), left(decider.full_name, 150)
  from public.curriculum_transfer_request r
  left join public.profile endorser on endorser.id = r.endorsed_by
  left join public.profile decider on decider.id = r.decided_by
  where r.id = p_transfer and saais_private.can_read_transfer(r.student_id, r.from_curriculum_version_id, r.to_curriculum_version_id);
$$;
revoke all on function saais_private.can_read_transfer(uuid, uuid, uuid), saais_private.transfer_names(uuid) from public, anon, authenticated;
grant execute on function saais_private.can_read_transfer(uuid, uuid, uuid), saais_private.transfer_names(uuid) to authenticated;

grant select (id, student_id, from_curriculum_version_id, to_curriculum_version_id, endorsed_by,
  endorsement_note, status, decided_by, decided_at, decision_note, carried_units, created_at, updated_at)
  on public.curriculum_transfer_request to authenticated;
create policy api_transfer_read on public.curriculum_transfer_request for select to authenticated
  using (saais_private.can_read_transfer(student_id, from_curriculum_version_id, to_curriculum_version_id));
create or replace view saais_api.curriculum_transfer_request with (security_barrier = true, security_invoker = true) as
select r.id, r.student_id, r.from_curriculum_version_id, r.to_curriculum_version_id, r.endorsed_by,
  names.endorsed_by_name, r.endorsement_note, r.status, r.decided_by, names.decided_by_name,
  r.decided_at, r.decision_note, r.carried_units, r.created_at, r.updated_at
from public.curriculum_transfer_request r cross join lateral saais_private.transfer_names(r.id) names
where saais_private.can_read_transfer(r.student_id, r.from_curriculum_version_id, r.to_curriculum_version_id);

grant select (id, department_id, warning_pct, probation_pct, dismissal_pct, sender_email, last_backup_at,
  last_backup_by, last_backup_reference, last_backup_location, last_backup_scope, updated_at)
  on public.system_settings to authenticated;
create policy api_settings_read on public.system_settings for select to authenticated
  using (saais_private.can_read_department(department_id, array['department_head','dean','admin']) or (
    department_id is null and saais_private.own_active_record(auth.uid()) and exists (
      select 1 from public.role_assignment a where a.profile_id = auth.uid()
        and a.role in ('adviser','department_head','dean'))));
alter view saais_api.system_settings set (security_invoker = true);
