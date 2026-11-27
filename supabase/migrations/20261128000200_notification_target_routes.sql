-- Nothing set notification.target_route, so live notifications had no link.
-- Every route here must be one the frontend allows for that role
-- (src/hooks/use-notifications.ts); a frontend test checks this list.
create function saais_private.notification_route(p_event text, p_role text, p_student uuid) returns text
language sql immutable set search_path = pg_catalog as $$
  select replace(r.route, '{student}', coalesce(p_student::text, ''))
  from (values
    ('midterm_grades_posted', 'student', '/student/grades'),
    ('final_grades_posted', 'student', '/student/grades'),
    ('inc_completed', 'student', '/student/grades'),
    ('grade_corrected', 'student', '/student/grades'),
    ('grade_corrected', 'department_head', '/department-head/students'),
    ('prerequisite_grade_corrected', 'student', '/student/grades'),
    ('prerequisite_grade_corrected', 'department_head', '/department-head/students'),
    ('grade_flag_submitted', 'adviser', '/adviser/grade-flags'),
    ('grade_flag_submitted', 'department_head', '/department-head/students'),
    ('grade_flag_resolved', 'student', '/student/grades'),
    ('grade_flag_resolved', 'adviser', '/adviser/grade-flags'),
    ('inc_deadline_approaching', 'student', '/student/grades'),
    ('inc_deadline_approaching', 'adviser', '/adviser/advisee/{student}/grades'),
    ('inc_lapsed', 'student', '/student/grades'),
    ('inc_lapsed', 'adviser', '/adviser/advisee/{student}/grades'),
    ('inc_lapsed', 'department_head', '/department-head/students'),
    ('standing_threshold_alert', 'student', '/student/dashboard'),
    ('standing_threshold_alert', 'adviser', '/adviser/advisee/{student}/checklist'),
    ('standing_threshold_alert', 'department_head', '/department-head/reports'),
    ('standing_threshold_alert', 'dean', '/dean/students'),
    ('adviser_assigned', 'student', '/student/profile'),
    ('adviser_assigned', 'adviser', '/adviser/advisee/{student}'),
    ('adviser_reassigned_away', 'adviser', '/adviser/advisees'),
    ('advising_note_added', 'student', '/student/dashboard'),
    ('advising_plan_saved', 'student', '/student/dashboard'),
    ('credit_decision_recorded', 'student', '/student/checklist'),
    ('credit_decision_revoked', 'student', '/student/checklist'),
    ('credit_decision_revoked', 'adviser', '/adviser/advisee/{student}/checklist'),
    ('curriculum_reassigned', 'student', '/student/checklist'),
    ('curriculum_reassigned', 'adviser', '/adviser/advisee/{student}/curriculum'),
    ('curriculum_transfer_decided', 'student', '/student/checklist'),
    ('curriculum_transfer_decided', 'adviser', '/adviser/advisee/{student}/curriculum'),
    ('curriculum_transfer_endorsed', 'student', '/student/dashboard'),
    ('curriculum_transfer_endorsed', 'department_head', '/department-head/curriculum-transfers'),
    ('catalog_updated', 'department_head', '/department-head/curricula'),
    ('catalog_updated', 'dean', '/dean/reports'),
    ('term_override_toggled', 'adviser', '/adviser/encode-grades'),
    ('term_override_toggled', 'department_head', '/department-head/academic-terms'),
    ('term_encoding_closed', 'adviser', '/adviser/encode-grades'),
    ('term_encoding_closed', 'department_staff', '/department-staff/academic-terms'),
    ('term_encoding_closed', 'department_head', '/department-head/academic-terms'),
    ('term_encoding_closed', 'dean', '/dean/reports'),
    ('encoding_deadline_approaching', 'adviser', '/adviser/encode-grades'),
    ('encoding_deadline_approaching', 'department_staff', '/department-staff/academic-terms'),
    ('encoding_deadline_approaching', 'department_head', '/department-head/academic-terms'),
    ('grade_import_committed', 'adviser', '/adviser/import-grades'),
    ('grade_import_committed', 'department_head', '/department-head/students'),
    ('grade_import_committed', 'department_staff', '/department-staff/students'),
    ('student_import_committed', 'adviser', '/adviser/advisees'),
    ('student_import_committed', 'department_head', '/department-head/students'),
    ('student_import_committed', 'admin', '/admin/students'),
    ('invitation_accepted', 'admin', '/admin/accounts'),
    ('invitation_accepted', 'department_head', '/department-head/students'),
    ('invitation_accepted', 'department_staff', '/department-staff/accounts'),
    ('invitation_expiring_soon', 'admin', '/admin/accounts'),
    ('invitation_expiring_soon', 'department_head', '/department-head/students'),
    ('invitation_expiring_soon', 'department_staff', '/department-staff/accounts'),
    ('unassigned_students_pending', 'department_head', '/department-head/adviser-assignments'),
    ('unassigned_students_pending', 'department_staff', '/department-staff/adviser-assignments'),
    ('unassigned_students_pending', 'admin', '/admin/students'),
    ('backup_overdue_reminder', 'department_head', '/department-head/settings'),
    ('backup_overdue_reminder', 'admin', '/admin/settings')
  ) r(event, role, route)
  where r.event = p_event and r.role = p_role
    and (p_student is not null or r.route not like '%{student}%')
$$;

-- A trigger covers notify() and the direct inserts without redefining them.
create function saais_private.set_notification_target_route() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_roles text[];
begin
  if new.recipient_id = new.target_student_id then
    v_roles := array['student'];
  else
    -- Recipients with several roles get the first one that has a page for the event.
    select coalesce(array_agg(held.role order by array_position(
        array['department_head', 'department_staff', 'dean', 'admin', 'adviser'], held.role)), '{}')
      into v_roles
    from (
      select r.role::text as role from public.role_assignment r where r.profile_id = new.recipient_id
      union
      select p.role::text from public.profile p where p.id = new.recipient_id
    ) held
    where held.role <> 'student';
    if new.target_student_id is not null
       and (saais_private.organization(new.target_student_id)->>'adviser_id')::uuid = new.recipient_id then
      v_roles := array['adviser'] || v_roles;
    end if;
  end if;

  select saais_private.notification_route(new.event_type, c.role, new.target_student_id)
    into new.target_route
  from unnest(v_roles) with ordinality c(role, position)
  where saais_private.notification_route(new.event_type, c.role, new.target_student_id) is not null
  order by c.position
  limit 1;
  return new;
end $$;

revoke all on function
  saais_private.notification_route(text, text, uuid),
  saais_private.set_notification_target_route()
  from public, anon, authenticated;

create trigger saais_set_notification_target_route
  before insert on public.notification
  for each row when (new.target_route is null)
  execute function saais_private.set_notification_target_route();
