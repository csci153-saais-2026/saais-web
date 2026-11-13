create table public.advising_plan (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profile(id) on delete restrict,
  school_term_id uuid not null references public.school_term(id) on delete restrict,
  student_curriculum_assignment_id uuid not null,
  created_by uuid not null references public.profile(id) on delete restrict,
  updated_by uuid not null references public.profile(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null check (revision >= 0),
  unique (student_id, school_term_id),
  unique (id, student_id, school_term_id),
  foreign key (student_curriculum_assignment_id, student_id)
    references public.student_curriculum_assignment(id, student_id) on delete restrict
);

create table public.advising_plan_item (
  id uuid primary key default gen_random_uuid(),
  advising_plan_id uuid not null,
  student_id uuid not null,
  school_term_id uuid not null,
  course_offering_id uuid not null,
  curriculum_term_course_id uuid references public.curriculum_term_course(id) on delete restrict,
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (advising_plan_id, course_offering_id),
  unique (advising_plan_id, curriculum_term_course_id),
  unique (advising_plan_id, display_order),
  foreign key (advising_plan_id, student_id, school_term_id)
    references public.advising_plan(id, student_id, school_term_id) on delete restrict,
  foreign key (course_offering_id, school_term_id)
    references public.course_offering(id, school_term_id) on delete restrict
);
create index advising_plan_item_student_term_idx on public.advising_plan_item(student_id, school_term_id);

alter table public.advising_plan enable row level security;
alter table public.advising_plan_item enable row level security;
revoke all on public.advising_plan, public.advising_plan_item from public, anon, authenticated;
grant select on public.advising_plan, public.advising_plan_item to authenticated;

create function saais_private.matt_can_read_plan(p_student uuid) returns boolean
language plpgsql stable security definer set search_path = pg_catalog as $$
begin
  return saais_private.matt_read_student(p_student) is not null;
exception when sqlstate 'PT401' or sqlstate 'PT403' or sqlstate 'PT404' or sqlstate 'PT409' then
  return false;
end
$$;
revoke all on function saais_private.matt_can_read_plan(uuid) from public, anon, authenticated;
grant execute on function saais_private.matt_can_read_plan(uuid) to authenticated;
create policy read_scoped_advising_plans on public.advising_plan for select to authenticated
  using (saais_private.matt_can_read_plan(student_id));
create policy read_scoped_advising_plan_items on public.advising_plan_item for select to authenticated
  using (saais_private.matt_can_read_plan(student_id));

-- A row describes a published term offering and slot, or a single exclusion
-- reason for a curriculum requirement. Multiple sections can share a slot.
create function saais_private.matt_recommendation_candidates(p_student uuid, p_curriculum uuid, p_term uuid)
returns table (
  slot_id uuid, elective boolean, slot_order integer, offering_id uuid, course_id uuid,
  code text, title text, units numeric, by_request boolean, retake boolean, exclusion text
) language sql stable set search_path = pg_catalog as $$
  with terms as (
    select t.id, dense_rank() over (order by t.year_level, t.term_sequence)::integer as position
    from public.curriculum_term t where t.curriculum_version_id = p_curriculum
  ), term_scope as (
    select t.chronological_key from public.school_term t where t.id = p_term
  ), recorded as materialized (
    select * from saais_private.matt_effective_attempts(p_student)
  ), horizon as (
    select coalesce(max(t.position), 0) + 1 as position
    from terms t join public.curriculum_term_course s on s.curriculum_term_id = t.id
    where exists (
      select 1 from recorded r where r.curriculum_term_course_id = s.id
        or (r.curriculum_term_course_id is null and r.course_id = s.course_id)
    )
  ), slots as materialized (
    select s.id, s.is_elective_slot, s.slot_type, s.course_id, t.position, summary.status
    from terms t join public.curriculum_term_course s on s.curriculum_term_id = t.id
    join saais_private.matt_checklist_slots(p_student, p_curriculum) summary on summary.slot_id = s.id
    where t.position <= (select position from horizon)
  ), offerings as materialized (
    select o.id, o.course_id, o.is_by_request, c.code, c.title, c.units, c.is_elective, c.category,
      exists (select 1 from recorded r where r.course_id = c.id and r.effective_status = 'passed') as completed,
      exists (select 1 from recorded r where r.course_id = c.id and r.effective_status = 'currently_enrolled') as enrolled,
      exists (select 1 from recorded r where r.course_id = c.id and r.school_term_id = p_term) as attempted_this_term,
      exists (
        select 1 from recorded r where r.course_id = c.id and r.effective_status = 'inc' and not r.is_lapsed_inc
      ) as open_inc,
      exists (
        select 1 from recorded r where r.course_id = c.id and r.chronological_key < (select chronological_key from term_scope)
          and (r.effective_status = 'failed' or r.is_lapsed_inc)
      ) as retake
    from public.course_offering o join public.course c on c.id = o.course_id
    where o.school_term_id = p_term and c.status = 'active'
  ), matches as materialized (
    select s.id as slot_id, s.is_elective_slot as elective, s.position as slot_order,
      o.id as offering_id, o.course_id, o.code, o.title, o.units, o.is_by_request as by_request, o.retake,
      case
        when s.status = 'passed' or o.completed then 'completed'
        when s.status = 'currently_enrolled' or o.enrolled then 'enrolled'
        when o.id is null then 'not_offered'
        when o.open_inc or o.attempted_this_term or exists (
          select 1 from saais_private.matt_unmet_prerequisites(p_student, o.course_id,
            (select chronological_key from term_scope))
        ) then 'blocked'
      end as exclusion
    from slots s left join offerings o on s.course_id = o.course_id or (
      s.is_elective_slot and (o.is_elective or o.category = 'elective' or (s.slot_type = 'ge' and o.category = 'ge'))
      and not exists (select 1 from public.curriculum_term_course fixed
        join public.curriculum_term t on t.id = fixed.curriculum_term_id
        where t.curriculum_version_id = p_curriculum and fixed.course_id = o.course_id)
    )
  ), excluded as (
    select distinct on (m.slot_id) m.slot_id, m.elective, m.slot_order, m.exclusion
    from matches m
    where m.exclusion is not null
      and not exists (select 1 from matches eligible where eligible.slot_id = m.slot_id and eligible.exclusion is null)
    order by m.slot_id, case m.exclusion when 'completed' then 1 when 'enrolled' then 2 when 'not_offered' then 3 else 4 end
  )
  select slot_id, elective, slot_order, offering_id, course_id, code, title, units, by_request, retake, exclusion
  from matches
  where exclusion is null
  union all
  select e.slot_id, e.elective, e.slot_order, null, null, null, null, null, false, false, e.exclusion
  from excluded e
  order by slot_order, slot_id, offering_id;
$$;

create function saais_private.matt_listrecommendations(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  student uuid := (p_params->>'student_id')::uuid;
  term uuid := (p_params->>'school_term_id')::uuid;
  org jsonb := saais_private.matt_read_student(student);
  department uuid := (org->>'department_id')::uuid;
  faculty uuid := (org->>'faculty_id')::uuid;
begin
  -- The general student read scope also includes Staff, but this contract
  -- permits scoped Heads/Deans/Admins and assigned Advisers only.
  if not (saais_private.has_role('admin')
    or saais_private.has_role('department_head', department)
    or saais_private.has_role('dean', null, faculty)
    or (saais_private.has_role('adviser') and exists (
      select 1 from public.adviser_assignment a where a.student_id = student and a.adviser_id = auth.uid()
        and a.start_date <= (statement_timestamp() at time zone 'Asia/Manila')::date
    ))) then
    perform saais_private.fail(403, 'Recommendations are outside your authorized scope.');
  end if;
  if not exists (select 1 from public.school_term t where t.id = term) then
    perform saais_private.fail(404, 'School term not found.');
  end if;

  return (
    with candidates as materialized (
      select * from saais_private.matt_recommendation_candidates(student, (org->>'curriculum_version_id')::uuid, term)
    ), page as (
      select * from candidates where exclusion is null order by slot_order, code, offering_id, slot_id
      limit coalesce((p_params->>'limit')::integer, 20) offset coalesce((p_params->>'offset')::integer, 0)
    ), counts as (
      select count(*) filter (where exclusion = 'completed') as completed_count,
        count(*) filter (where exclusion = 'enrolled') as enrolled_count,
        count(*) filter (where exclusion = 'not_offered') as not_offered_count,
        count(*) filter (where exclusion in ('completed', 'enrolled', 'not_offered')) as total_excluded
      from candidates
    )
    select jsonb_build_object('excluded_count', counts.total_excluded, 'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'course_offering_id', offering_id, 'curriculum_term_course_id', slot_id, 'code', code, 'title', title, 'units', units,
        'why', case when retake then 'Retake an unresolved failed or lapsed INC requirement.'
          when elective then 'An offered course for an unfulfilled elective requirement.'
          else 'Fulfills a curriculum requirement in your recommendation range.' end,
        'badges', to_jsonb(array_remove(array[case when elective then 'Elective' end,
          case when by_request then 'By request' end, case when retake then 'Retake' end], null)),
        'excluded_summary', to_jsonb(counts)
      ) order by slot_order, code, offering_id, slot_id) from page
    ), '[]')) from counts
  );
end
$$;

create function saais_private.matt_saveadvisingplan(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  student uuid := (p_params->>'student_id')::uuid;
  term uuid := (p_params->>'school_term_id')::uuid;
  org jsonb := saais_private.matt_grade_student(student);
  assignment uuid := (org->>'student_curriculum_assignment_id')::uuid;
  curriculum uuid := (org->>'curriculum_version_id')::uuid;
  revision_number bigint := (p_body->>'expected_revision')::bigint;
  previous public.advising_plan;
  saved public.advising_plan;
  selections jsonb;
  old_items jsonb;
  saved_items jsonb;
begin
  if not exists (select 1 from public.school_term t where t.id = term) then
    perform saais_private.fail(404, 'School term not found.');
  end if;
  if assignment is distinct from (p_body->>'expected_curriculum_assignment_id')::uuid then
    perform saais_private.matt_grade_conflict('STALE_REVISION', 'The student curriculum changed. Reload the recommendations.');
  end if;
  select p.* into previous from public.advising_plan p
    where p.student_id = student and p.school_term_id = term for update;
  if previous.revision is distinct from revision_number then
    perform saais_private.matt_grade_conflict('STALE_REVISION', 'The advising plan changed. Reload before saving.');
  end if;

  with eligible as materialized (
    select * from saais_private.matt_recommendation_candidates(student, curriculum, term) where exclusion is null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'slot_id', e.slot_id, 'offering_id', e.offering_id, 'course_id', e.course_id, 'position', i.ordinality - 1
  ) order by i.ordinality), '[]') into selections
  from jsonb_array_elements(p_body->'items') with ordinality i(item, ordinality)
  cross join lateral (
    select e.* from eligible e where e.offering_id = (i.item->>'course_offering_id')::uuid
      and (i.item->>'curriculum_term_course_id' is null or e.slot_id = (i.item->>'curriculum_term_course_id')::uuid)
    order by e.elective, e.slot_order, e.slot_id limit 1
  ) e;
  if jsonb_array_length(selections) <> jsonb_array_length(p_body->'items') then
    perform saais_private.fail(400, 'Choose eligible recommendations from the selected term.');
  end if;
  if exists (
    select 1 from jsonb_array_elements(selections) x
    group by x->>'course_id' having count(*) > 1
  ) or exists (
    select 1 from jsonb_array_elements(selections) x
    group by x->>'slot_id' having count(*) > 1
  ) then
    perform saais_private.fail(400, 'Choose one offering per course and one course per curriculum requirement.');
  end if;

  if previous.id is null then
    insert into public.advising_plan(student_id, school_term_id, student_curriculum_assignment_id, created_by, updated_by, revision)
      values(student, term, assignment, auth.uid(), auth.uid(), 1) returning * into saved;
  else
    select coalesce(jsonb_agg(to_jsonb(i) order by i.display_order), '[]') into old_items
      from public.advising_plan_item i where i.advising_plan_id = previous.id;
    update public.advising_plan p
      set student_curriculum_assignment_id = assignment, updated_by = auth.uid(),
        updated_at = clock_timestamp(), revision = p.revision + 1
      where p.id = previous.id returning * into saved;
    delete from public.advising_plan_item i where i.advising_plan_id = saved.id;
  end if;

  with inserted as (
    insert into public.advising_plan_item(
      advising_plan_id, student_id, school_term_id, course_offering_id, curriculum_term_course_id, display_order
    )
    select saved.id, student, term, (x->>'offering_id')::uuid, (x->>'slot_id')::uuid, (x->>'position')::integer
    from jsonb_array_elements(selections) x returning *
  )
  select coalesce(jsonb_agg(to_jsonb(i) order by i.display_order), '[]') into saved_items from inserted i;
  perform saais_private.audit('advising_plan_saved', 'advising_plan', saved.id,
    case when previous.id is not null then jsonb_build_object('plan', to_jsonb(previous), 'items', old_items) end,
    jsonb_build_object('plan', to_jsonb(saved), 'items', saved_items), student);
  perform saais_private.notify('advising_plan_saved', 'note', array[student], 'advising_plan', saved.id, student);
  return jsonb_build_object('plan', to_jsonb(saved), 'items', saved_items);
end
$$;

revoke all on function saais_private.matt_recommendation_candidates(uuid, uuid, uuid),
  saais_private.matt_listrecommendations(jsonb, jsonb), saais_private.matt_saveadvisingplan(jsonb, jsonb)
  from public, anon, authenticated;
