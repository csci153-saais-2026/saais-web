do $$
declare
  admin uuid := '00000001-0000-4000-8000-000000000000';
  head uuid := '00000002-0000-4000-8000-000000000000';
  staff uuid := '00000003-0000-4000-8000-000000000000';
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  student uuid := '00000005-0000-4000-8000-000000000000';
  expected record;
  actual text;
begin
  for expected in
    select * from (values
      ('final_grades_posted', student, student, '/student/grades'),
      ('grade_flag_submitted', adviser, student, '/adviser/grade-flags'),
      ('grade_flag_submitted', head, student, '/department-head/students'),
      ('inc_lapsed', adviser, student, '/adviser/advisee/' || student || '/grades'),
      ('term_encoding_closed', staff, null, '/department-staff/academic-terms'),
      ('backup_overdue_reminder', admin, null, '/admin/settings'),
      -- No page for this event and role, so no link.
      ('final_grades_posted', admin, student, null),
      ('not_a_known_event', head, null, null)
    ) as v(event, recipient, target, route)
  loop
    insert into public.notification(recipient_id, kind, event_type, title, body, target_student_id)
      values (expected.recipient, 'alert', expected.event, 'Title', 'Body', expected.target)
      returning target_route into actual;
    perform test.assert(actual is not distinct from expected.route,
      expected.event || ' expected ' || coalesce(expected.route, 'no route') || ', got ' || coalesce(actual, 'no route'));
  end loop;

  insert into public.notification(recipient_id, kind, event_type, title, body, target_route)
    values (admin, 'alert', 'backup_overdue_reminder', 'Title', 'Body', '/notifications')
    returning target_route into actual;
  perform test.assert(actual = '/notifications', 'A route given by the writer is kept');

  -- Through the helper that writes most notifications.
  perform saais_private.notify('advising_note_added', 'note', array[student], 'advising_note', gen_random_uuid(), student);
  perform test.assert(exists(select 1 from public.notification
    where recipient_id = student and event_type = 'advising_note_added' and target_route = '/student/dashboard'),
    'notify() rows get a route');
end $$;

-- Every agreed event and role pair resolves, and nothing else does.
do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  wrong text;
begin
  with agreed(event, role, route) as (
    values
      ('inc_deadline_approaching', 'department_head', '/department-head/students'),
      ('credit_decision_recorded', 'adviser', '/adviser/advisee/{student}/checklist'),
      ('term_override_toggled', 'department_staff', '/department-staff/academic-terms'),
      ('term_override_toggled', 'dean', '/dean/reports'),
      ('encoding_deadline_approaching', 'dean', '/dean/reports'),
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
  ),
  actual as (
    select e.event, r.role,
      saais_private.notification_route(e.event, r.role, student) as route
    from (select distinct event from agreed) e
    cross join unnest(array['student','adviser','department_staff','department_head','dean','admin']) r(role)
  )
  select string_agg(a.event || '/' || a.role, ', ') into wrong
  from actual a
  left join agreed g using (event, role)
  where a.route is distinct from replace(g.route, '{student}', student::text);
  perform test.assert(wrong is null, 'Unexpected notification routes: ' || coalesce(wrong, ''));
end $$;

-- A real term override reaches its audience with links; admin links are deferred.
do $$
declare
  term uuid;
  bad integer;
begin
  insert into public.school_term(start_year,end_year,term_type,ends_on)
    values(2090,2091,'1st Semester','2090-12-01') returning id into term;
  delete from public.notification where event_type = 'term_override_toggled';
  perform test.login(1);
  perform test.call('setSchoolTermOverride',jsonb_build_object('school_term_id',term),'{"enabled":true}');
  select count(*) into bad from public.notification n
  where n.event_type = 'term_override_toggled'
    and n.target_route is distinct from case
      when exists(select 1 from public.role_assignment r
        where r.profile_id = n.recipient_id and r.role = 'department_head')
        then '/department-head/academic-terms'
      when exists(select 1 from public.role_assignment r
        where r.profile_id = n.recipient_id and r.role = 'adviser')
        then '/adviser/encode-grades'
    end;
  perform test.assert(bad = 0, 'Term override recipients get the page for their role');
  perform test.assert((select count(*) from public.notification
    where event_type = 'term_override_toggled' and target_route is not null) > 0,
    'Term override notifications were created with links');
end $$;
