-- Use explicit column lists and security barriers for every published relation.
-- The owner reads the base tables. The view filters rows using the caller's session.

create view saais_api.faculty with (security_barrier = true) as
select
  r.id, r.code, r.name, r.letterhead_prefix, r.letterhead_name,
  (select left(p.full_name, 150) from public.role_assignment a join public.profile p on p.id = a.profile_id
    where a.role = 'dean' and a.faculty_id = r.id and p.status = 'active'
    order by a.created_at, a.id limit 1) as dean_name
from public.faculty r
where saais_private.own_active_record(auth.uid());

create view saais_api.department with (security_barrier = true) as
select
  r.id, r.faculty_id, r.code, r.name, r.letterhead_prefix, r.letterhead_name,
  (select left(p.full_name, 150) from public.role_assignment a join public.profile p on p.id = a.profile_id
    where a.role = 'department_head' and a.department_id = r.id and p.status = 'active'
    order by a.created_at, a.id limit 1) as department_head_name,
  (select left(p.full_name, 150) from public.role_assignment a join public.profile p on p.id = a.profile_id
    where a.role = 'dean' and a.faculty_id = r.faculty_id and p.status = 'active'
    order by a.created_at, a.id limit 1) as dean_name
from public.department r
where saais_private.own_active_record(auth.uid());

create view saais_api.program with (security_barrier = true) as
select
  r.id, r.code, r.name, r.nominal_duration, r.status, r.department_id
from public.program r
where saais_private.own_active_record(auth.uid());

create view saais_api.course with (security_barrier = true) as
select
  r.id, r.department_id, r.code, r.title, r.category, r.units, r.is_elective, r.status,
  r.repeatable_type
from public.course r
where saais_private.own_active_record(auth.uid());

create view saais_api.prerequisite with (security_barrier = true) as
select
  r.id, r.course_id, r.prerequisite_course_id, r.type
from public.prerequisite r
where saais_private.own_active_record(auth.uid());

create view saais_api.course_offering with (security_barrier = true) as
select
  r.id, r.school_term_id, r.course_id, r.section, r.schedule, r.instructor, r.is_by_request
from public.course_offering r
where saais_private.own_active_record(auth.uid());

create view saais_api.school_term with (security_barrier = true) as
select
  r.id, r.start_year, r.end_year, r.term_type, r.school_year, r.is_locked, r.override_flag,
  r.override_actor_id, r.override_at, r.starts_on, r.ends_on, r.encoding_deadline, r.closed_by,
  left(closer.full_name, 150) as closed_by_name, r.closed_at, r.closure_note,
  (select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'school_term_id', c.school_term_id, 'department_id', c.department_id,
      'is_closed', c.is_closed, 'closed_by', c.closed_by, 'closed_at', c.closed_at,
      'closure_note', c.closure_note, 'updated_at', c.updated_at
    ) order by c.department_id), '[]'::jsonb)
    from public.department_term_encoding c where c.school_term_id = r.id) as department_closures,
  r.default_inc_deadline, r.chronological_key
from public.school_term r
left join public.profile closer on closer.id = r.closed_by
where saais_private.own_active_record(auth.uid());

create view saais_api.department_term_encoding with (security_barrier = true) as
select
  r.id, r.school_term_id, r.department_id, r.is_closed, r.closed_by,
  left(closer.full_name, 150) as closed_by_name, r.updated_at, r.closed_at, r.closure_note
from public.department_term_encoding r
left join public.profile closer on closer.id = r.closed_by
where saais_private.own_active_record(auth.uid());

create view saais_api.curriculum_version with (security_barrier = true) as
select
  r.id, r.program_id, r.version_label, r.effective_start, r.effective_end, r.delinquency_threshold,
  r.total_units, r.status,
  (select count(*) from public.student_curriculum_assignment a
    where a.curriculum_version_id = r.id and a.end_date is null
      and saais_private.can_read_student(a.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin'])) as enrolled_student_count
from public.curriculum_version r
where saais_private.can_read_curriculum(r.id);

create view saais_api.curriculum_term with (security_barrier = true) as
select
  r.id, r.curriculum_version_id, r.year_level, r.term_sequence
from public.curriculum_term r
where saais_private.can_read_curriculum(r.curriculum_version_id);

create view saais_api.curriculum_term_course with (security_barrier = true) as
select
  r.id, r.curriculum_term_id, r.course_id, r.is_elective_slot, r.slot_type, r.slot_label,
  r.nominal_units
from public.curriculum_term_course r
join public.curriculum_term t on t.id = r.curriculum_term_id
where saais_private.can_read_curriculum(t.curriculum_version_id);

create view saais_api.curriculum_pair_equivalence with (security_barrier = true) as
select
  r.id, r.from_curriculum_version_id, r.to_curriculum_version_id, r.source_course_id,
  r.target_course_id, r.note, r.created_by, r.created_at
from public.curriculum_pair_equivalence r
where saais_private.can_read_curriculum(r.from_curriculum_version_id)
   or saais_private.can_read_curriculum(r.to_curriculum_version_id);

create view saais_api.profile with (security_barrier = true) as
select
  r.id, r.role,
  array(select distinct a.role from public.role_assignment a
    where a.profile_id = r.id order by a.role) as roles,
  r.email, r.full_name, r.student_number, r.status, r.invitation_status, r.invitation_sent_at,
  r.invitation_expires_at, r.created_at, r.updated_at, r.faculty_id, r.department_id, r.avatar_url,
  r.consultation_hours
from public.profile r
where saais_private.can_read_profile(r.id, true);

create view saais_api.role_assignment with (security_barrier = true) as
select
  r.id, r.profile_id, r.role, r.faculty_id, r.department_id, r.created_at
from public.role_assignment r
where saais_private.can_read_profile(r.profile_id, false);

create view saais_api.adviser_assignment with (security_barrier = true) as
select
  r.id, r.adviser_id, left(adviser.full_name, 150) as adviser_name, adviser.email as adviser_email,
  left(faculty.name, 250) as adviser_faculty_name,
  adviser.consultation_hours as adviser_consultation_hours, r.student_id, r.start_date, r.end_date,
  next_adviser.id as handed_over_to_adviser_id,
  left(next_adviser.full_name, 150) as handed_over_to_name,
  case when next_adviser.id is not null
    then left('Handed over to ' || next_adviser.full_name || ' (' || to_char(r.end_date, 'Mon YYYY') || ')', 200) end as handover_label,
  r.created_at
from public.adviser_assignment r
join public.profile adviser on adviser.id = r.adviser_id
left join public.department d on d.id = adviser.department_id
left join public.faculty faculty on faculty.id = coalesce(adviser.faculty_id, d.faculty_id)
left join public.adviser_assignment successor on successor.student_id = r.student_id and successor.start_date = r.end_date
left join public.profile next_adviser on next_adviser.id = successor.adviser_id
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.student_curriculum_assignment with (security_barrier = true) as
select
  r.id, r.student_id, r.curriculum_version_id, r.start_date, r.end_date, r.reason as change_note,
  r.created_at
from public.student_curriculum_assignment r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.student_organization with (security_barrier = true) as
select
  r.student_id, r.id as student_curriculum_assignment_id, r.curriculum_version_id, p.id as program_id,
  d.id as department_id, d.faculty_id as faculty_id, a.adviser_id as adviser_id,
  s.entry_year as entry_year
from public.student_curriculum_assignment r
join public.curriculum_version v on v.id = r.curriculum_version_id
join public.program p on p.id = v.program_id
join public.department d on d.id = p.department_id
join public.profile s on s.id = r.student_id
left join public.adviser_assignment a on a.student_id = r.student_id and a.end_date is null
where r.end_date is null
  and saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.attempt with (security_barrier = true) as
select
  r.id, r.student_id, r.course_offering_id, r.curriculum_term_course_id, r.status, r.midterm_status,
  r.midterm_grade, r.final_grade, r.inc_deadline, r.instructor, r.prerequisite_override,
  r.prerequisite_grade_override, r.units_attempted, r.created_by, r.updated_by, r.revision,
  r.created_at, r.updated_at
from public.attempt r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.inc_resolution with (security_barrier = true) as
select
  r.id, r.student_id, r.attempt_id, r.completion_grade, r.resolved_by, r.resolved_at, r.updated_by,
  r.updated_at, r.effective_status
from public.inc_resolution r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.elective_mapping with (security_barrier = true) as
select
  r.id, r.attempt_id, r.curriculum_term_course_id, r.mapped_by, r.units_credited, r.created_at,
  r.updated_at, r.student_id, r.revoked_at
from public.elective_mapping r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.equivalency_decision with (security_barrier = true) as
select
  r.id, r.attempt_id, r.destination_curriculum_term_course_id, r.decision_type, r.decided_by,
  r.decided_at, r.units_credited, r.student_id, r.updated_at, r.revoked_at
from public.equivalency_decision r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.outside_credit with (security_barrier = true) as
select
  r.id, r.student_id, r.entry_type, r.origin_school, r.original_course_code, r.original_course_title,
  r.units, r.grade, r.destination_curriculum_term_course_id, r.units_credited, r.decided_by,
  r.decided_at, r.revoked_at, r.updated_at
from public.outside_credit r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.advising_plan with (security_barrier = true) as
select
  r.id, r.student_id, r.school_term_id, r.student_curriculum_assignment_id, r.created_by,
  r.updated_by, r.created_at, r.updated_at, r.revision
from public.advising_plan r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.advising_plan_item with (security_barrier = true) as
select
  r.id, r.advising_plan_id, r.student_id, r.school_term_id, r.course_offering_id,
  r.curriculum_term_course_id, r.display_order, r.created_at
from public.advising_plan_item r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);

create view saais_api.advising_note with (security_barrier = true) as
select
  r.id, r.student_id, r.authored_by, r.author_name, r.author_role_label, r.body_text, r.is_archived,
  r.archived_at, r.archived_by, r.created_at
from public.advising_note r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'admin']);

create view saais_api.grade_flag with (security_barrier = true) as
select
  r.id, r.student_id, r.attempt_id, r.reported_stage, r.reported_grade_text, r.issue_type, r.details,
  r.status, r.resolution_action, r.corrected_grade, r.corrected_status, r.resolution_note,
  r.resolved_by, r.resolved_at, r.created_at, r.updated_at
from public.grade_flag r
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'admin']);

create view saais_api.attempt_remark with (security_barrier = true) as
select
  r.id, r.student_id, r.authored_by, r.body_text, r.created_at, r.attempt_id,
  r.curriculum_term_course_id
from public.attempt_remark r
where saais_private.can_read_student(r.student_id, array['adviser', 'department_head', 'admin']);

create view saais_api.curriculum_transfer_request with (security_barrier = true) as
select
  r.id, r.student_id, r.from_curriculum_version_id, r.to_curriculum_version_id, r.endorsed_by,
  left(endorser.full_name, 150) as endorsed_by_name, r.endorsement_note, r.status, r.decided_by,
  left(decider.full_name, 150) as decided_by_name, r.decided_at, r.decision_note, r.carried_units,
  r.created_at, r.updated_at
from public.curriculum_transfer_request r
left join public.profile endorser on endorser.id = r.endorsed_by
left join public.profile decider on decider.id = r.decided_by
where saais_private.can_read_student(r.student_id, array['student', 'adviser', 'department_head', 'dean', 'admin'])
   or exists (
     select 1 from public.curriculum_version v join public.program p on p.id = v.program_id
     where v.id in (r.from_curriculum_version_id, r.to_curriculum_version_id)
       and saais_private.can_read_department(p.department_id, array['department_head', 'dean'])
   );

create view saais_api.audit_log_entry with (security_barrier = true) as
select
  r.id, r.actor_id, r.actor_name, r.actor_role, r.student_id, left(s.full_name, 150) as student_name,
  s.student_number as student_number,
  left(nullif(concat_ws(' · ', s.student_number, s.full_name), ''), 250) as target_label, r.action,
  r.action_category, r.entity_type, r.entity_id,
  left(coalesce(r.reason, r.action), 1000) as details_summary,
  case when saais_private.can_read_department(null, array['admin']) then r.old_value end as old_value,
  case when saais_private.can_read_department(null, array['admin']) then r.new_value end as new_value, r.reason, r.created_at
from public.audit_log_entry r
left join public.profile s on s.id = r.student_id
where saais_private.can_read_student(r.student_id, array['adviser', 'department_head', 'dean', 'admin'])
   or (r.student_id is null and saais_private.own_active_record(r.actor_id) and (
     exists (select 1 from public.role_assignment a where a.profile_id = auth.uid() and a.role in ('adviser','department_head','dean'))
   ));

create view saais_api.notification with (security_barrier = true) as
select
  r.id, r.recipient_id, r.kind, r.event_type, r.title, r.body, r.target_route, r.target_student_id,
  r.actor_id, r.entity_type, r.entity_id, r.dedupe_key, r.email_delivery_status, r.is_read, r.read_at,
  r.created_at
from public.notification r
where saais_private.own_active_record(r.recipient_id);

create view saais_api.system_settings with (security_barrier = true) as
select
  r.id, r.department_id, r.warning_pct, r.probation_pct, r.dismissal_pct, r.sender_email,
  r.last_backup_at, r.last_backup_by, r.last_backup_reference, r.last_backup_location,
  r.last_backup_scope, r.updated_at
from public.system_settings r
where saais_private.can_read_department(r.department_id, array['department_head', 'dean', 'admin']) or (
    r.department_id is null and saais_private.own_active_record(auth.uid()) and (
      exists (select 1 from public.role_assignment a where a.profile_id = auth.uid() and a.role in ('adviser','department_head','dean'))
    )
  );

-- The predicate inside this helper also protects direct SQL callers.
create function saais_private.read_attempt_results(p_student uuid) returns setof jsonb
language sql stable security definer set search_path = pg_catalog as $$
  select saais_private.matt_attempt_result(a.id)
  from public.attempt a
  where a.student_id = p_student
    and saais_private.can_read_student(p_student, array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin']);
$$;
revoke all on function saais_private.read_attempt_results(uuid) from public, anon, authenticated;
grant execute on function saais_private.read_attempt_results(uuid) to authenticated;

create view saais_api.attempt_result with (security_barrier = true) as
select r.*
from saais_api.student_organization s
cross join lateral saais_private.read_attempt_results(s.student_id) result
cross join lateral jsonb_to_record(result) as r (
  id uuid, student_id uuid, course_offering_id uuid, curriculum_term_course_id uuid,
  recorded_status text, midterm_status text, midterm_grade numeric, final_grade numeric,
  inc_deadline date, instructor text, prerequisite_override boolean, prerequisite_grade_override boolean,
  grade_fix_history jsonb, units_attempted numeric, revision bigint, created_at timestamptz,
  updated_at timestamptz, completion_grade numeric, resolved_at timestamptz, effective_status text,
  gwa_grade numeric, is_lapsed_inc boolean, is_repeated boolean, counts_toward_cumulative_gwa boolean
);

-- Supabase may grant public-table privileges by default. Only account
-- bootstrap and recipient-only notifications keep their existing RLS reads.
revoke select on public.adviser_assignment, public.advising_note,
  public.attempt, public.attempt_remark, public.audit_log_entry,
  public.course, public.course_offering, public.curriculum_pair_equivalence, public.curriculum_term,
  public.curriculum_term_course, public.curriculum_transfer_request, public.curriculum_version,
  public.department, public.department_term_encoding, public.elective_mapping, public.equivalency_decision,
  public.faculty, public.grade_flag, public.inc_resolution, public.outside_credit, public.prerequisite,
  public.program, public.school_term, public.student_curriculum_assignment, public.system_settings
  from public, anon, authenticated;
revoke select on public.profile from public, anon, authenticated;
grant select (id, role, email, full_name, student_number, status, invitation_status, invitation_sent_at, invitation_expires_at, created_at, updated_at, faculty_id, department_id, avatar_url, consultation_hours) on public.profile to authenticated;

revoke all on all tables in schema saais_api from public, anon, authenticated;
grant select on all tables in schema saais_api to authenticated;
