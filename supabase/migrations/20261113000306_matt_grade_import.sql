create function saais_private.matt_importgradesbatch(p_params jsonb,p_body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare
  preview boolean := p_body->>'mode'='preview';
  term_id uuid := (p_body->>'school_term_id')::uuid;
  input_row jsonb;
  student uuid;
  org jsonb;
  term public.school_term;
  offerings uuid[];
  grade_input jsonb;
  result_rows jsonb := '[]';
  seen text[] := array[]::text[];
  row_key text;
  outcome text;
  message text;
  valid_count int := 0;
  error_count int := 0;
begin
  if not exists(select 1 from public.school_term t where t.id=term_id) then
    perform saais_private.fail(400,'School term not found.');
  end if;
  for input_row in select value from jsonb_array_elements(p_body->'rows') loop
    outcome := 'error';
    message := null;
    student := null;
    begin
      select p.id into student from public.profile p
        where p.status='active' and lower(btrim(p.student_number))=lower(btrim(input_row->>'student_number'));
      if student is null then perform saais_private.fail(400,'Student is not available to this adviser.'); end if;
      org := saais_private.matt_grade_student(student);
      term := saais_private.matt_grade_open_term(term_id,(org->>'department_id')::uuid);
      select array_agg(o.id order by o.id) into offerings
        from public.course_offering o join public.course c on c.id=o.course_id
        where o.school_term_id=term_id and lower(btrim(c.code))=lower(btrim(input_row->>'course_code'));
      if coalesce(cardinality(offerings),0)<>1 then
        perform saais_private.fail(400,'Course code must identify one offering in the selected term.');
      end if;
      row_key := student::text||':'||offerings[1]::text;
      if row_key=any(seen) then perform saais_private.fail(400,'This batch already includes this student and offering.'); end if;
      if not (input_row ?| array['status','midterm_status','midterm_grade','final_grade']) then
        perform saais_private.fail(400,'Provide a grade or status.');
      end if;
      grade_input := input_row - array['row_number','student_number','course_code'] ||
        jsonb_build_object('course_offering_id',offerings[1]);
      perform saais_private.matt_record_grade_row(student,org,term,grade_input,'importGradesBatch');
      if preview then raise sqlstate 'P1000'; end if;
      outcome := 'imported';
    exception
      when sqlstate 'P1000' then outcome := 'valid';
      when sqlstate 'PT403' or sqlstate 'PT404' then message := 'Student or course is not available to this adviser.';
      when sqlstate 'PT400' or sqlstate 'PT409' then message := sqlerrm;
      when unique_violation or check_violation or foreign_key_violation then message := 'The row conflicts with an existing academic record.';
    end;
    if outcome='error' then error_count := error_count + 1;
    else
      valid_count := valid_count + 1;
      seen := array_append(seen,row_key);
    end if;
    result_rows := result_rows || jsonb_build_array(jsonb_build_object(
      'row_number',input_row->'row_number','student_number',input_row->'student_number',
      'course_code',input_row->'course_code','outcome',outcome,'message',message));
  end loop;
  return jsonb_build_object('mode',p_body->>'mode','valid_count',valid_count,'warning_count',0,
    'error_count',error_count,'imported_count',case when preview then 0 else valid_count end,'results',result_rows);
end $$;
