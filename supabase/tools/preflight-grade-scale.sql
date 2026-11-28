select
  (
    select count(*) from public.attempt
    where final_grade between 3.25 and 4.75
  ) as final_in_3_25_to_4_75,
  (
    select count(*) from public.inc_resolution
    where completion_grade between 3.25 and 4.75
  ) as inc_in_3_25_to_4_75,
  (
    select count(*) from public.grade_flag
    where reported_stage is distinct from 'midterm'
      and corrected_grade between 3.25 and 4.75
  ) as final_flag_in_3_25_to_4_75,
  (
    select count(*) from public.attempt
    where final_grade is not null
      and not (
        final_grade = 5
        or (final_grade between 1 and 3 and mod(final_grade * 4, 1) = 0)
      )
  ) as final_constraint_violations,
  (
    select count(*) from public.inc_resolution
    where not (
      completion_grade = 5
      or (completion_grade between 1 and 3 and mod(completion_grade * 4, 1) = 0)
    )
  ) as inc_constraint_violations,
  (
    select count(*) from public.grade_flag
    where corrected_grade is not null and not (
      case when reported_stage = 'midterm' then
        corrected_grade between 1 and 5 and mod(corrected_grade * 4, 1) = 0
      else
        corrected_grade = 5
        or (corrected_grade between 1 and 3 and mod(corrected_grade * 4, 1) = 0)
      end
    )
  ) as flag_constraint_violations;
