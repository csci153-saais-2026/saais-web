grant select (id, curriculum_term_id, course_id, is_elective_slot, slot_type, slot_label, nominal_units)
  on public.curriculum_term_course to authenticated;
create policy api_curriculum_term_course_read on public.curriculum_term_course for select to authenticated
  using (exists (select 1 from public.curriculum_term t
    where t.id = curriculum_term_id and saais_private.can_read_curriculum(t.curriculum_version_id)));
alter view saais_api.curriculum_term_course set (security_invoker = true);

-- The old own_roles policy remains valid and is a subset of this scoped read.
create policy api_role_assignment_read on public.role_assignment for select to authenticated
  using (saais_private.can_read_profile(profile_id, false));
alter view saais_api.role_assignment set (security_invoker = true);
