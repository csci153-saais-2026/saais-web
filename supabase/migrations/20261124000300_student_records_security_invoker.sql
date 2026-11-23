-- These single-table projections can use the caller's privileges when the
-- underlying table grants are limited to the columns the API already returns.
grant select (id, student_id, curriculum_version_id, start_date, end_date, reason, created_at) on public.student_curriculum_assignment to authenticated;
grant select (id, student_id, course_offering_id, curriculum_term_course_id, status, midterm_status, midterm_grade, final_grade, inc_deadline, instructor, prerequisite_override, prerequisite_grade_override, units_attempted, created_by, updated_by, revision, created_at, updated_at) on public.attempt to authenticated;
grant select (id, student_id, attempt_id, completion_grade, resolved_by, resolved_at, updated_by, updated_at, effective_status) on public.inc_resolution to authenticated;
grant select (id, attempt_id, curriculum_term_course_id, mapped_by, units_credited, created_at, updated_at, student_id, revoked_at) on public.elective_mapping to authenticated;
grant select (id, attempt_id, destination_curriculum_term_course_id, decision_type, decided_by, decided_at, units_credited, student_id, updated_at, revoked_at) on public.equivalency_decision to authenticated;
grant select (id, student_id, entry_type, origin_school, original_course_code, original_course_title, units, grade, destination_curriculum_term_course_id, units_credited, decided_by, decided_at, revoked_at, updated_at) on public.outside_credit to authenticated;
grant select (id, student_id, authored_by, author_name, author_role_label, body_text, is_archived, archived_at, archived_by, created_at) on public.advising_note to authenticated;
grant select (id, student_id, attempt_id, reported_stage, reported_grade_text, issue_type, details, status, resolution_action, corrected_grade, corrected_status, resolution_note, resolved_by, resolved_at, created_at, updated_at) on public.grade_flag to authenticated;
grant select (id, student_id, authored_by, body_text, created_at, attempt_id, curriculum_term_course_id) on public.attempt_remark to authenticated;

create policy api_student_curriculum_read on public.student_curriculum_assignment for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_attempt_read on public.attempt for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_inc_resolution_read on public.inc_resolution for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_elective_mapping_read on public.elective_mapping for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_equivalency_decision_read on public.equivalency_decision for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_outside_credit_read on public.outside_credit for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','department_staff','dean','admin']));
create policy api_advising_note_read on public.advising_note for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','admin']));
create policy api_grade_flag_read on public.grade_flag for select to authenticated using (saais_private.can_read_student(student_id, array['student','adviser','department_head','admin']));
create policy api_attempt_remark_read on public.attempt_remark for select to authenticated using (saais_private.can_read_student(student_id, array['adviser','department_head','admin']));

alter view saais_api.student_curriculum_assignment set (security_invoker = true);
alter view saais_api.attempt set (security_invoker = true);
alter view saais_api.inc_resolution set (security_invoker = true);
alter view saais_api.elective_mapping set (security_invoker = true);
alter view saais_api.equivalency_decision set (security_invoker = true);
alter view saais_api.outside_credit set (security_invoker = true);
alter view saais_api.advising_note set (security_invoker = true);
alter view saais_api.grade_flag set (security_invoker = true);
alter view saais_api.attempt_remark set (security_invoker = true);
