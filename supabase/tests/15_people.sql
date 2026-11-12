do $$declare faculty uuid; department uuid; f jsonb; d jsonb; p jsonb; v jsonb; person integer; role_name public.role_type;
begin
  perform test.login(1);
  select (value->>'id')::uuid into faculty from test.records where name='faculty';
  select (value->>'id')::uuid into department from test.records where name='department';
  f:=test.call('createFaculty','{}','{"name":"Test Faculty B"}');
  d:=test.call('createDepartment','{}',jsonb_build_object('faculty_id',f->>'id','name','Test Department B'));
  p:=test.call('createProgram','{}',jsonb_build_object('department_id',d->>'id','code','TSTB','name','Test Program B','nominal_duration',4));
  v:=test.call('createCurriculumVersion','{}',jsonb_build_object('program_id',p->>'id','version_label','B2026','effective_start','2026-01-01','status','active'));
  insert into test.records values('faculty_b',f),('department_b',d),('program_b',p),('version_b',v);
  for person in 2..10 loop
    role_name:=case person when 2 then 'department_head' when 3 then 'department_staff' when 4 then 'adviser' when 5 then 'student' when 6 then 'department_head' when 7 then 'dean' when 8 then 'adviser' when 9 then 'student' else 'admin' end;
    insert into public.profile(id,role,email,full_name,status,student_number,faculty_id,department_id)
      values((lpad(person::text,8,'0')||'-0000-4000-8000-000000000000')::uuid,role_name,'person'||person||'@example.test','Person '||person,
        case when person=10 then 'disabled'::public.profile_status else 'active'::public.profile_status end,
        case when role_name='student' then 'TEST-'||person end,case when role_name='adviser' then faculty end,
        case when role_name in ('department_head','department_staff','adviser') then case when person=6 then (d->>'id')::uuid else department end end);
    insert into public.role_assignment(profile_id,role,faculty_id,department_id)
      values((lpad(person::text,8,'0')||'-0000-4000-8000-000000000000')::uuid,role_name,
        case when role_name in ('adviser','dean') then faculty end,
        case when role_name in ('department_head','department_staff','adviser') then case when person=6 then (d->>'id')::uuid else department end end);
  end loop;
end$$;
