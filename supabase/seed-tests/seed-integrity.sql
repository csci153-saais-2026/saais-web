-- Run after a local Supabase reset. This must not modify the seeded data.
do $$
begin
  if (select count(distinct p.id) from public.program p join public.curriculum_version v on v.program_id = p.id
      where p.status = 'active' and v.status = 'active' and v.delinquency_threshold is not null) < 2 then
    raise exception 'Seed requires active curricula in at least two programs';
  end if;
  if not exists (
    select 1 from public.prerequisite a
    join public.prerequisite b on b.course_id = a.prerequisite_course_id
    join public.prerequisite c on c.course_id = b.prerequisite_course_id
    where a.type = 'recommended' and b.type = 'co_requisite' and c.type = 'strict'
  ) then raise exception 'Seed requires a chain with all three prerequisite types'; end if;
  if not exists (select 1 from public.course c join public.course_offering o on o.course_id = c.id
    where c.status = 'discontinued' and o.is_by_request) then
    raise exception 'Seed requires a discontinued course offered by request';
  end if;
  if not exists (select 1 from public.school_term where is_locked) then
    raise exception 'Seed requires a locked term';
  end if;
  if not exists (select 1 from public.course where repeatable_type = 'none')
    or not exists (select 1 from public.course where repeatable_type = 'grade_replacement') then
    raise exception 'Seed requires non-repeatable and grade-replacement courses';
  end if;
  if (select count(*) from public.profile where role = 'student') < 2
     or (select count(*) from public.profile where role = 'adviser') < 2
     or not exists (select 1 from public.profile where role = 'admin') then
    raise exception 'Seed requires student, adviser and admin profiles';
  end if;
  if exists (select 1 from public.profile p left join auth.users u on u.id = p.id where u.id is null) then
    raise exception 'Every seeded profile must have a corresponding Auth user';
  end if;
  if (select count(distinct role) from public.role_assignment
      where role in ('student', 'adviser', 'department_staff', 'department_head', 'dean', 'admin')) <> 6 then
    raise exception 'Seed requires accounts for all six roles';
  end if;
  if exists (select 1 from public.profile p where p.role = 'student' and p.status = 'active'
    and not exists (select 1 from public.adviser_assignment a where a.student_id = p.id and a.end_date is null)) then
    raise exception 'Every active seeded student must have an adviser';
  end if;
end;
$$;
