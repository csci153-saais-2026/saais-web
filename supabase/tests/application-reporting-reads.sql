do $$
declare
  department uuid := (select (value->>'id')::uuid from test.records where name = 'department');
  other_department uuid := (select (value->>'id')::uuid from test.records where name = 'department_b');
  faculty uuid := (select (value->>'id')::uuid from test.records where name = 'faculty');
  term uuid := (select (value->>'id')::uuid from test.records where name = 'school_term');
  adviser uuid := '00000004-0000-4000-8000-000000000000';
  other_adviser uuid := '00000008-0000-4000-8000-000000000000';
  department_students integer;
  result jsonb;
begin
  perform test.login(4);
  result := public.matt_operation('getAdviserDashboardReport', jsonb_build_object('school_term_id', term));
  perform test.assert((result->>'adviser_id')::uuid = adviser and (result->>'total_advisees')::integer = 1,
    'Adviser dashboard only includes current advisees.');
  perform test.assert((result->'grade_distribution'->>'total_graded')::integer > 0,
    'Term grade distribution derives from actual grades.');
  begin
    perform public.matt_operation('getAdviserDashboardReport', jsonb_build_object('adviser_id', other_adviser));
    raise exception 'Adviser viewed another adviser report.';
  exception when sqlstate 'PT403' then null;
  end;

  perform test.login(2);
  select count(*) into department_students from public.student_curriculum_assignment a
  join public.curriculum_version v on v.id = a.curriculum_version_id
  join public.program p on p.id = v.program_id
  join public.profile s on s.id = a.student_id
  where a.end_date is null and p.department_id = department and s.status in ('active', 'invited');
  result := public.matt_operation('getDepartmentReport', jsonb_build_object('school_term_id', term));
  perform test.assert((result->>'department_id')::uuid = department and (result->>'total_students')::integer = department_students
    and jsonb_array_length(result->'adviser_caseloads') >= 1, 'Department report resolves the caller department.');
  begin
    perform public.matt_operation('getDepartmentReport', jsonb_build_object('department_id', other_department));
    raise exception 'Department Head viewed a cross-department report.';
  exception when sqlstate 'PT403' then null;
  end;

  perform test.login(7);
  result := public.matt_operation('getFacultyReport', jsonb_build_object('department_id', department));
  perform test.assert((result->>'faculty_id')::uuid = faculty and (result->>'total_students')::integer = department_students
    and jsonb_array_length(result->'department_summaries') = 1, 'Faculty report applies the department filter.');
  begin
    perform public.matt_operation('getFacultyReport', jsonb_build_object('department_id', other_department));
    raise exception 'Dean viewed another faculty report.';
  exception when sqlstate 'PT403' then null;
  end;
end
$$;
