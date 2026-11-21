-- Exercise cloning through the public transactional RPC, using independent role assignments.
create function test.clone_counts() returns jsonb language sql as $$
  select jsonb_build_object(
    'versions', (select count(*) from public.curriculum_version),
    'terms', (select count(*) from public.curriculum_term),
    'slots', (select count(*) from public.curriculum_term_course),
    'audits', (select count(*) from public.audit_log_entry),
    'notifications', (select count(*) from public.notification)
  );
$$;

create function test.expect_clone_denied(payload jsonb, scenario text) returns void
language plpgsql as $$
declare before_counts jsonb := test.clone_counts();
begin
  perform test.expect('PT403', 'createCurriculumVersion', '{}', payload);
  perform test.assert(test.clone_counts() = before_counts,
    scenario || ': denied clone created curriculum, terms, slots, audit, or notifications');
end;
$$;

create function test.assert_clone(source_id uuid, target jsonb, target_program uuid, expected_role text, scenario text)
returns void language plpgsql as $$
declare copied_terms jsonb; source_terms jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'year_level', term.year_level,
    'term_sequence', term.term_sequence,
    'slots', (select jsonb_agg(to_jsonb(slot) - 'id' - 'curriculum_term_id'
      order by slot.slot_label, slot.course_id)
      from public.curriculum_term_course slot where slot.curriculum_term_id = term.id)
  ) order by term.year_level, term.term_sequence)
  into source_terms from public.curriculum_term term where term.curriculum_version_id = source_id;

  select jsonb_agg(jsonb_build_object(
    'year_level', term.year_level,
    'term_sequence', term.term_sequence,
    'slots', (select jsonb_agg(to_jsonb(slot) - 'id' - 'curriculum_term_id'
      order by slot.slot_label, slot.course_id)
      from public.curriculum_term_course slot where slot.curriculum_term_id = term.id)
  ) order by term.year_level, term.term_sequence)
  into copied_terms from public.curriculum_term term
  where term.curriculum_version_id = (target->>'id')::uuid;

  perform test.assert(source_terms is not null and copied_terms = source_terms,
    scenario || ': copied terms or slots differ from the source');
  perform test.assert((target->>'id')::uuid <> source_id, scenario || ': source ID was reused');
  perform test.assert((target->>'program_id')::uuid = target_program,
    scenario || ': target program metadata was lost');
  perform test.assert((target->>'total_units')::numeric = 6,
    scenario || ': copied units were not recomputed');
  perform test.assert(not exists(
    select 1 from public.curriculum_term source_term
    join public.curriculum_term target_term on target_term.id = source_term.id
    where source_term.curriculum_version_id = source_id
      and target_term.curriculum_version_id = (target->>'id')::uuid
  ), scenario || ': a source term ID was reused');
  perform test.assert(not exists(
    select 1 from public.curriculum_term source_term
    join public.curriculum_term_course source_slot on source_slot.curriculum_term_id = source_term.id
    join public.curriculum_term_course target_slot on target_slot.id = source_slot.id
    join public.curriculum_term target_term on target_term.id = target_slot.curriculum_term_id
    where source_term.curriculum_version_id = source_id
      and target_term.curriculum_version_id = (target->>'id')::uuid
  ), scenario || ': a source slot ID was reused');
  perform test.assert(exists(
    select 1 from public.audit_log_entry audit
    where audit.entity_id = (target->>'id')::uuid
      and audit.action = 'createCurriculumVersion'
      and audit.actor_id = auth.uid()
      and audit.actor_role::text = expected_role
  ), scenario || ': audit did not record the eligible department role');
end;
$$;

do $$
declare
  department_a uuid;
  department_b uuid;
  program_a uuid;
  program_b uuid;
  target_program jsonb;
  source_a jsonb;
  source_b jsonb;
  first_term jsonb;
  second_term jsonb;
  course_a uuid;
  course_b jsonb;
  cloned jsonb;
  blank jsonb;
  person integer;
  department_role public.role_type;
  clone_body jsonb;
  source_id uuid;
  target_id uuid;
  scenario text;
begin
  perform test.login(1);
  select (value->>'id')::uuid into department_a from test.records where name = 'department';
  select (value->>'id')::uuid into department_b from test.records where name = 'department_b';
  select (value->>'id')::uuid into program_a from test.records where name = 'program';
  select (value->>'id')::uuid into program_b from test.records where name = 'program_b';
  select (value->>'id')::uuid into course_a from test.records where name = 'course';

  target_program := test.call('createProgram', '{}', jsonb_build_object(
    'department_id', department_a, 'code', 'CLONE-TARGET', 'name', 'Clone Target Program',
    'nominal_duration', 4
  ));
  source_a := test.call('createCurriculumVersion', '{}', jsonb_build_object(
    'program_id', program_a, 'version_label', 'Clone source A', 'effective_start', '2026-01-01'
  ));
  source_b := test.call('createCurriculumVersion', '{}', jsonb_build_object(
    'program_id', program_b, 'version_label', 'Clone source B', 'effective_start', '2026-01-01'
  ));
  course_b := test.call('createCourse', '{}', jsonb_build_object(
    'department_id', department_b, 'code', 'CLONE-B', 'title', 'Clone source course B', 'units', 3
  ));

  for source_id, target_id in
    select (source_a->>'id')::uuid, course_a
    union all select (source_b->>'id')::uuid, (course_b->>'id')::uuid
  loop
    first_term := test.call('createCurriculumTerm', '{}', jsonb_build_object(
      'curriculum_version_id', source_id, 'year_level', 1, 'term_sequence', 1
    ));
    second_term := test.call('createCurriculumTerm', '{}', jsonb_build_object(
      'curriculum_version_id', source_id, 'year_level', 1, 'term_sequence', 2
    ));
    perform test.call('createCurriculumTermCourse', '{}', jsonb_build_object(
      'curriculum_term_id', first_term->>'id', 'course_id', target_id,
      'is_elective_slot', false, 'nominal_units', 3
    ));
    perform test.call('createCurriculumTermCourse', '{}', jsonb_build_object(
      'curriculum_term_id', first_term->>'id', 'is_elective_slot', true,
      'slot_label', 'Zero-unit elective', 'nominal_units', 0
    ));
    perform test.call('createCurriculumTermCourse', '{}', jsonb_build_object(
      'curriculum_term_id', second_term->>'id', 'is_elective_slot', true,
      'slot_type', 'ge', 'slot_label', 'General education elective', 'nominal_units', 3
    ));
  end loop;

  -- Head and Staff can copy into a different program within their department.
  for person in 2..3 loop
    perform test.login(person);
    scenario := case person when 2 then 'Department Head' else 'Department Staff' end;
    clone_body := jsonb_build_object(
      'program_id', target_program->>'id', 'clone_from_version_id', source_a->>'id',
      'version_label', scenario || ' copy', 'effective_start', '2027-01-01'
    );
    if person = 3 then
      clone_body := jsonb_build_object(
        'program_id', target_program->>'id', 'clone_from_version_id', source_a->>'id',
        'curriculum', jsonb_build_object('version_label', scenario || ' copy',
          'effective_start', '2027-01-01', 'delinquency_threshold', 12,
          'total_units', 0, 'terms', '[]'::jsonb)
      );
    end if;
    cloned := test.call('createCurriculumVersion', '{}', clone_body);
    perform test.assert_clone((source_a->>'id')::uuid, cloned,
      (target_program->>'id')::uuid,
      case person when 2 then 'department_head' else 'department_staff' end, scenario);
    perform test.assert(cloned->>'version_label' = scenario || ' copy'
      and cloned->>'effective_start' = '2027-01-01', scenario || ': target metadata was overwritten');

    perform test.expect_clone_denied(jsonb_build_object(
      'program_id', program_a, 'clone_from_version_id', source_b->>'id',
      'version_label', 'Denied source ' || person, 'effective_start', '2027-01-01'
    ), scenario || ' source outside assignment');
    perform test.expect_clone_denied(jsonb_build_object(
      'program_id', program_b, 'clone_from_version_id', source_a->>'id',
      'version_label', 'Denied target ' || person, 'effective_start', '2027-01-01'
    ), scenario || ' target outside assignment');
    perform test.expect_clone_denied(jsonb_build_object(
      'program_id', program_b, 'clone_from_version_id', source_b->>'id',
      'version_label', 'Denied both ' || person, 'effective_start', '2027-01-01'
    ), scenario || ' source and target outside assignment');
  end loop;

  -- Separate assignments in both departments still cannot authorize a cross-department copy.
  perform test.login(2);
  insert into public.role_assignment(profile_id, role, department_id)
    values(auth.uid(), 'department_staff', department_b);
  cloned := test.call('createCurriculumVersion', '{}', jsonb_build_object(
    'program_id', program_b, 'clone_from_version_id', source_b->>'id',
    'version_label', 'Head A plus Staff B same-department copy', 'effective_start', '2027-01-01'
  ));
  perform test.assert_clone((source_b->>'id')::uuid, cloned, program_b, 'department_staff', 'Head A plus Staff B');
  perform test.expect_clone_denied(jsonb_build_object(
    'program_id', program_b, 'clone_from_version_id', source_a->>'id',
    'version_label', 'Separate role scope cross-department denial', 'effective_start', '2027-01-01'
  ), 'Head A plus Staff B cannot combine scopes for cross-department cloning');
  perform test.expect_clone_denied(jsonb_build_object(
    'program_id', program_a, 'clone_from_version_id', source_b->>'id',
    'version_label', 'Separate role scope reverse denial', 'effective_start', '2027-01-01'
  ), 'Staff B plus Head A cannot combine scopes for cross-department cloning');
  delete from public.role_assignment
    where profile_id = auth.uid() and role = 'department_staff' and department_id = department_b;

  perform test.login(1);
  perform test.expect_clone_denied(jsonb_build_object(
    'program_id', program_a, 'clone_from_version_id', source_a->>'id',
    'version_label', 'Denied Admin-only clone', 'effective_start', '2027-01-01'
  ), 'Admin-only');
  blank := test.call('createCurriculumVersion', '{}', jsonb_build_object(
    'program_id', program_b, 'clone_from_version_id', null,
    'version_label', 'Admin blank version', 'effective_start', '2027-01-01'
  ));
  perform test.assert((blank->>'total_units')::numeric = 0 and not exists(
    select 1 from public.curriculum_term where curriculum_version_id = (blank->>'id')::uuid
  ), 'Admin-only blank version must remain available');

  -- Admin does not widen an independently assigned Head or Staff department.
  foreach department_role in array array['department_head', 'department_staff']::public.role_type[] loop
    insert into public.role_assignment(profile_id, role, department_id)
      values(auth.uid(), department_role, department_a);
    cloned := test.call('createCurriculumVersion', '{}', jsonb_build_object(
      'program_id', target_program->>'id', 'clone_from_version_id', source_a->>'id',
      'version_label', 'Admin plus ' || department_role, 'effective_start', '2027-01-01'
    ));
    perform test.assert_clone((source_a->>'id')::uuid, cloned,
      (target_program->>'id')::uuid, department_role::text, 'Admin plus ' || department_role);
    perform test.expect_clone_denied(jsonb_build_object(
      'program_id', program_a, 'clone_from_version_id', source_b->>'id',
      'version_label', 'Admin source denied ' || department_role, 'effective_start', '2027-01-01'
    ), 'Admin plus ' || department_role || ' source outside assignment');
    perform test.expect_clone_denied(jsonb_build_object(
      'program_id', program_b, 'clone_from_version_id', source_a->>'id',
      'version_label', 'Admin target denied ' || department_role, 'effective_start', '2027-01-01'
    ), 'Admin plus ' || department_role || ' target outside assignment');
    perform test.expect_clone_denied(jsonb_build_object(
      'program_id', program_b, 'clone_from_version_id', source_b->>'id',
      'version_label', 'Admin both denied ' || department_role, 'effective_start', '2027-01-01'
    ), 'Admin plus ' || department_role || ' cannot widen scope to another department');
    delete from public.role_assignment where profile_id = auth.uid() and role = department_role;
  end loop;
end;
$$;
