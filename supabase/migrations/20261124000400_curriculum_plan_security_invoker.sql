-- Match the published row filters for the single-table curriculum and plan views.
grant select (id, curriculum_version_id, year_level, term_sequence) on public.curriculum_term to authenticated;
grant select (id, from_curriculum_version_id, to_curriculum_version_id, source_course_id, target_course_id, note, created_by, created_at) on public.curriculum_pair_equivalence to authenticated;
grant select (id, student_id, school_term_id, student_curriculum_assignment_id, created_by, updated_by, created_at, updated_at, revision) on public.advising_plan to authenticated;
grant select (id, advising_plan_id, student_id, school_term_id, course_offering_id, curriculum_term_course_id, display_order, created_at) on public.advising_plan_item to authenticated;

create policy api_curriculum_term_read on public.curriculum_term for select to authenticated using (saais_private.can_read_curriculum(curriculum_version_id));
create policy api_curriculum_equivalence_read on public.curriculum_pair_equivalence for select to authenticated using (saais_private.can_read_curriculum(from_curriculum_version_id) or saais_private.can_read_curriculum(to_curriculum_version_id));
-- The previous plan policies predate the published view and can differ in scope.
drop policy read_scoped_advising_plans on public.advising_plan;
drop policy read_scoped_advising_plan_items on public.advising_plan_item;
create policy api_advising_plan_read on public.advising_plan for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_advising_plan_item_read on public.advising_plan_item for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));

alter view saais_api.curriculum_term set (security_invoker = true);
alter view saais_api.curriculum_pair_equivalence set (security_invoker = true);
alter view saais_api.advising_plan set (security_invoker = true);
alter view saais_api.advising_plan_item set (security_invoker = true);
-- Notification already has the same recipient-only RLS policy as the view.
alter view saais_api.notification set (security_invoker = true);
