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
