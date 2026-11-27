-- Prevent batch grade imports from clearing a recorded final grade or
-- terminal status when setting midterm_status = 'dr' on an attempt that has no
-- midterm recorded yet.
create or replace function saais_private.matt_record_grade_row(
  p_student_id uuid, p_org jsonb, p_term public.school_term, p_row jsonb, p_operation text
) returns uuid language plpgsql set search_path = pg_catalog as $$
declare previous public.attempt;
begin
  if p_operation = 'importGradesBatch' then
    select * into previous from public.attempt a where a.student_id=p_student_id
      and a.course_offering_id=(p_row->>'course_offering_id')::uuid for update;
    if found and (
      (previous.midterm_grade is not null and p_row ? 'midterm_grade'
        and previous.midterm_grade is distinct from (p_row->>'midterm_grade')::numeric)
      or (previous.midterm_status = 'dr' and (p_row ? 'midterm_grade' or p_row ? 'midterm_status'))
      or (previous.status in ('dr','na') and p_row ?| array['final_grade','status'])
      or (p_row->>'midterm_status' = 'dr'
        and (previous.final_grade is not null or previous.status <> 'currently_enrolled'))
      or (previous.final_grade is not null and p_row ? 'final_grade'
        and previous.final_grade is distinct from (p_row->>'final_grade')::numeric)
      or (previous.midterm_status is not null and p_row ? 'midterm_status'
        and previous.midterm_status is distinct from p_row->>'midterm_status')
      or (previous.status <> 'currently_enrolled' and p_row ? 'status'
        and previous.status::text is distinct from p_row->>'status')
    ) then
      perform saais_private.matt_grade_conflict('GRADE_ALREADY_RECORDED',
        'Use grade correction with a reason for an existing result.');
    end if;
  end if;
  return saais_private.matt_record_grade_row_unchecked_import(p_student_id,p_org,p_term,p_row,p_operation);
end $$;
