do $$
declare
  department uuid := (select (value->>'id')::uuid from test.records where name='department');
  term uuid := (select (value->>'id')::uuid from test.records where name='school_term');
  course jsonb;
  offering jsonb;
  input jsonb;
  result jsonb;
  terminal_status text;
  course_code text;
  mode text;
begin
  perform test.login(1);
  course := test.call('createCourse','{}',jsonb_build_object('department_id',department,'code','IMPORT201','title','Import test','units',3));
  offering := test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',course->>'id'));
  perform test.login(4);
  input := jsonb_build_object('mode','preview','school_term_id',term,'rows',jsonb_build_array(
    '{"row_number":1,"student_number":"TEST-5","course_code":"IMPORT201","final_grade":2}'::jsonb,
    '{"row_number":2,"student_number":"TEST-5","course_code":"IMPORT201","final_grade":3}'::jsonb,
    '{"row_number":3,"student_number":"TEST-9","course_code":"IMPORT201","final_grade":2}'::jsonb));
  result := public.matt_operation('importGradesBatch','{}',input);
  perform test.assert(result->>'valid_count'='1' and result->>'error_count'='2' and result->>'imported_count'='0','preview validates and rejects duplicates and out-of-scope students');
  perform test.assert(not exists(select 1 from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),'preview rolls back grade writes');
  result := public.matt_operation('importGradesBatch','{}',input||'{"mode":"commit"}');
  perform test.assert(result->>'imported_count'='1' and result->>'error_count'='2','commit saves only valid rows');
  perform test.assert((select count(*) from public.attempt a where a.course_offering_id=(offering->>'id')::uuid and a.final_grade=2)=1,'grade is persisted');
  perform test.assert(exists(select 1 from public.notification where event_type='grade_import_committed' and recipient_id=auth.uid()),
    'Committed import notifies the adviser');
  result := public.matt_operation('importGradesBatch','{}',input||'{"mode":"commit"}'::jsonb ||
    jsonb_build_object('rows',jsonb_build_array('{"row_number":1,"student_number":"TEST-5","course_code":"IMPORT201","final_grade":3}'::jsonb)));
  perform test.assert(result->>'error_count'='1' and result->>'imported_count'='0',
    'A different existing grade is rejected on import');
  perform test.assert((select final_grade=2 from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),
    'Rejected import preserves the recorded grade');
  -- Verify importing midterm_status='dr' over a recorded final grade with no
  -- midterm is rejected in both preview and commit without erasing the grade.
  foreach mode in array array['preview','commit'] loop
    result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode',mode,'school_term_id',term,
      'rows',jsonb_build_array('{"row_number":1,"student_number":"TEST-5","course_code":"IMPORT201","midterm_status":"dr"}'::jsonb)));
    perform test.assert(result->>'error_count'='1' and result->>'valid_count'='0' and result->>'imported_count'='0'
      and result->'results'->0->>'message'='Use grade correction with a reason for an existing result.',
      'Importing DR midterm over a recorded final grade is rejected in ' || mode);
  end loop;
  perform test.assert((select a.final_grade=2 and a.status='passed' and a.midterm_status is null and a.midterm_grade is null
    from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),
    'Rejected DR midterm import preserves the recorded final grade and passed status');
  -- Verify a recorded DR midterm cannot be replaced by an import row.
  perform test.login(1);
  course := test.call('createCourse','{}',jsonb_build_object('department_id',department,'code','IMPORT202','title','Import DR test','units',3));
  offering := test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',course->>'id'));
  perform test.login(4);
  result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode','commit','school_term_id',term,
    'rows',jsonb_build_array('{"row_number":1,"student_number":"TEST-5","course_code":"IMPORT202","midterm_status":"dr"}'::jsonb)));
  perform test.assert(result->>'imported_count'='1','DR midterm imports cleanly');
  result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode','commit','school_term_id',term,
    'rows',jsonb_build_array('{"row_number":1,"student_number":"TEST-5","course_code":"IMPORT202","midterm_grade":2.5}'::jsonb)));
  perform test.assert(result->>'error_count'='1' and result->>'imported_count'='0',
    'Importing a midterm grade over a recorded DR result is rejected');
  perform test.assert((select midterm_status='dr' and midterm_grade is null from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),
    'Rejected import preserves the recorded DR midterm');

  foreach terminal_status in array array['dr','na'] loop
    course_code := 'IMPORT-' || upper(terminal_status);
    perform test.login(1);
    course := test.call('createCourse','{}',jsonb_build_object(
      'department_id',department,'code',course_code,'title','Import terminal status test','units',3));
    offering := test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',course->>'id'));
    perform test.login(4);
    result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode','commit','school_term_id',term,
      'rows',jsonb_build_array(jsonb_build_object(
        'row_number',1,'student_number','TEST-5','course_code',course_code,'status',terminal_status))));
    perform test.assert(result->>'imported_count'='1','An initial terminal status imports cleanly');

    foreach mode in array array['preview','commit'] loop
      result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode',mode,'school_term_id',term,
        'rows',jsonb_build_array(
          jsonb_build_object('row_number',1,'student_number','TEST-5','course_code',course_code,'final_grade',2),
          jsonb_build_object('row_number',2,'student_number','TEST-5','course_code',course_code,'status',terminal_status),
          jsonb_build_object('row_number',3,'student_number','TEST-5','course_code',course_code,'midterm_status','dr'))));
      perform test.assert(result->>'error_count'='3' and result->>'valid_count'='0' and
        (select bool_and(item->>'message'='Use grade correction with a reason for an existing result.')
          from jsonb_array_elements(result->'results') as items(item)),
        'Preview and commit reject numeric, status, and DR midterm edits to a recorded ' || upper(terminal_status));
    end loop;
    perform test.assert((select a.status::text=terminal_status and a.final_grade is null
      from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),
      'Rejected import preserves the recorded final status');
  end loop;

  -- Verify VSU numeric grade scale enforcement (1.00-3.00 in 0.25 steps, plus 5.00)
  -- across grade import preview and commit.
  declare
    scale_grade numeric;
    scale_code text;
    scale_blocked boolean;
  begin
    foreach scale_grade in array array[1.00, 3.00, 5.00] loop
      scale_code := 'IMPSCALE-' || replace(scale_grade::text, '.', '_');
      perform test.login(1);
      course := test.call('createCourse','{}',jsonb_build_object(
        'department_id',department,'code',scale_code,'title','Scale accept test','units',3));
      offering := test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',course->>'id'));
      perform test.login(4);
      result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode','preview','school_term_id',term,
        'rows',jsonb_build_array(jsonb_build_object(
          'row_number',1,'student_number','TEST-5','course_code',scale_code,'final_grade',scale_grade))));
      perform test.assert(result->>'valid_count'='1' and result->>'error_count'='0',
        'Grade import preview accepts valid scale grade ' || scale_grade);
      result := public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode','commit','school_term_id',term,
        'rows',jsonb_build_array(jsonb_build_object(
          'row_number',1,'student_number','TEST-5','course_code',scale_code,'final_grade',scale_grade))));
      perform test.assert(result->>'imported_count'='1' and result->>'error_count'='0',
        'Grade import commit accepts valid scale grade ' || scale_grade);
    end loop;

    perform test.login(1);
    course := test.call('createCourse','{}',jsonb_build_object(
      'department_id',department,'code','IMPSCALE-BAD','title','Scale reject test','units',3));
    offering := test.call('createCourseOffering','{}',jsonb_build_object('school_term_id',term,'course_id',course->>'id'));
    perform test.login(4);
    foreach mode in array array['preview','commit'] loop
      foreach scale_grade in array array[3.25, 4.75] loop
        scale_blocked := false;
        begin
          perform public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode',mode,'school_term_id',term,
            'rows',jsonb_build_array(jsonb_build_object(
              'row_number',1,'student_number','TEST-5','course_code','IMPSCALE-BAD','final_grade',scale_grade))));
        exception when sqlstate 'PT400' then scale_blocked := true; end;
        perform test.assert(scale_blocked,
          'Grade import ' || mode || ' rejects off-scale final grade ' || scale_grade);

        scale_blocked := false;
        begin
          perform public.matt_operation('importGradesBatch','{}',jsonb_build_object('mode',mode,'school_term_id',term,
            'rows',jsonb_build_array(jsonb_build_object(
              'row_number',1,'student_number','TEST-5','course_code','IMPSCALE-BAD','midterm_grade',scale_grade))));
        exception when sqlstate 'PT400' then scale_blocked := true; end;
        perform test.assert(scale_blocked,
          'Grade import ' || mode || ' rejects off-scale midterm grade ' || scale_grade);
      end loop;
    end loop;
    perform test.assert(not exists(select 1 from public.attempt a where a.course_offering_id=(offering->>'id')::uuid),
      'Rejected off-scale grade imports write no attempt rows');
  end;
end $$;
