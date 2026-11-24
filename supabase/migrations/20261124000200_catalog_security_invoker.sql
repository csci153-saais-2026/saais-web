-- Expose only the columns already present in these catalog projections.
-- The same active-account predicate applies to direct table reads.
grant select (id, code, name, nominal_duration, status, department_id) on public.program to authenticated;
grant select (id, department_id, code, title, category, units, is_elective, status, repeatable_type) on public.course to authenticated;
grant select (id, course_id, prerequisite_course_id, type) on public.prerequisite to authenticated;
grant select (id, school_term_id, course_id, section, schedule, instructor, is_by_request) on public.course_offering to authenticated;

create policy catalog_program_read on public.program for select to authenticated using (saais_private.own_active_record(auth.uid()));
create policy catalog_course_read on public.course for select to authenticated using (saais_private.own_active_record(auth.uid()));
create policy catalog_prerequisite_read on public.prerequisite for select to authenticated using (saais_private.own_active_record(auth.uid()));
create policy catalog_course_offering_read on public.course_offering for select to authenticated using (saais_private.own_active_record(auth.uid()));

alter view saais_api.program set (security_invoker = true);
alter view saais_api.course set (security_invoker = true);
alter view saais_api.prerequisite set (security_invoker = true);
alter view saais_api.course_offering set (security_invoker = true);
