create function saais_private.matt_direct_slot(p_curriculum_id uuid, p_course_id uuid) returns uuid
language sql stable set search_path = pg_catalog, public as $$
  select s.id
  from public.curriculum_term_course s
  join public.curriculum_term t on t.id = s.curriculum_term_id
  where t.curriculum_version_id = p_curriculum_id and s.course_id = p_course_id
    and not s.is_elective_slot
  order by t.id, s.id
  limit 1;
$$;

create function saais_private.matt_unmet_prerequisites(
  p_student_id uuid, p_course_id uuid, p_term_order integer
) returns table(item jsonb)
language sql stable set search_path = pg_catalog, public as $$
  select jsonb_build_object(
    'prerequisite_course_id', c.id, 'code', c.code, 'title', c.title, 'type', 'strict',
    'current_status', coalesce(latest.status, 'not_taken'),
    'latest_attempt_id', latest.id, 'latest_final_grade', latest.grade
  )
  from public.prerequisite p
  join public.course c on c.id = p.prerequisite_course_id
  left join lateral (
    select a.id, coalesce(i.completion_grade, a.final_grade) as grade,
      case when i.completion_grade > 3 then 'failed'
        when a.status = 'inc' and a.inc_deadline < (statement_timestamp() at time zone 'Asia/Manila')::date then 'lapsed_inc'
        when a.status = 'na' then 'not_taken' else a.status::text end as status
    from public.attempt a
    join public.course_offering o on o.id = a.course_offering_id
    join public.school_term t on t.id = o.school_term_id
    left join public.inc_resolution i on i.attempt_id = a.id
    where a.student_id = p_student_id and o.course_id = c.id and t.chronological_key <= p_term_order
    order by t.chronological_key desc, a.created_at desc, a.id desc
    limit 1
  ) latest on true
  where p.course_id = p_course_id and p.type = 'strict'
    and not exists (
      select 1
      from public.attempt a
      join public.course_offering o on o.id = a.course_offering_id
      join public.school_term t on t.id = o.school_term_id
      where a.student_id = p_student_id and o.course_id = c.id and t.chronological_key < p_term_order
        and saais_private.passed(a.id)
    )
  order by c.code, c.id;
$$;

create function saais_private.matt_searchstudentcourseofferings(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_org jsonb := saais_private.matt_grade_student(v_student_id, true);
  v_term_id uuid := (p_params->>'school_term_id')::uuid;
  v_search text := lower(btrim(coalesce(p_params->>'search', '')));
  v_term_order integer;
  v_result jsonb;
begin
  select t.chronological_key into v_term_order from public.school_term t where t.id = v_term_id;
  if not found then
    perform saais_private.fail(404, 'School term not found.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'offering', to_jsonb(o) - array['direct_slot', 'code', 'title', 'units', 'sort_group'],
    'code', o.code, 'title', o.title, 'units', o.units,
    'group', case when o.sort_group = 0 then 'program' else 'cross_program' end,
    'direct_curriculum_slot_id', o.direct_slot,
    'instructor_options', case when nullif(btrim(o.instructor), '') is null then '[]'::jsonb else jsonb_build_array(o.instructor) end,
    'has_unmet_strict_prerequisites', jsonb_array_length(p.items) > 0,
    'unmet_prerequisites', p.items
  ) order by o.sort_group, o.code, o.id), '[]'::jsonb) into v_result
  from (
    select o.*, c.code, c.title, c.units, slot.direct_slot,
      case when slot.direct_slot is not null then 0 else 1 end as sort_group
    from public.course_offering o
    join public.course c on c.id = o.course_id
    cross join lateral (select saais_private.matt_direct_slot((v_org->>'curriculum_version_id')::uuid, c.id) as direct_slot) slot
    where o.school_term_id = v_term_id
      and (strpos(lower(c.code), v_search) > 0 or strpos(lower(c.title), v_search) > 0)
    order by sort_group, c.code, o.id
    limit coalesce((p_params->>'limit')::integer, 20)
    offset coalesce((p_params->>'offset')::integer, 0)
  ) o
  cross join lateral (
    select coalesce(jsonb_agg(q.item order by q.item->>'code', q.item->>'prerequisite_course_id'), '[]'::jsonb) as items
    from (select item from saais_private.matt_unmet_prerequisites(v_student_id, o.course_id, v_term_order) limit 20) q
  ) p;
  return v_result;
end
$$;
