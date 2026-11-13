do $$
declare
  admin_id uuid := '00000001-0000-4000-8000-000000000000';
  student_a uuid := '00000005-0000-4000-8000-000000000000';
  student_b uuid := '00000009-0000-4000-8000-000000000000';
  directory jsonb;
begin
  perform test.login(2);
  directory := public.matt_operation('listAccounts','{"role":"student"}');
  perform test.assert(directory @> jsonb_build_array(jsonb_build_object('profile',jsonb_build_object('id',student_a))),'Head sees own department student');
  perform test.assert(not directory @> jsonb_build_array(jsonb_build_object('profile',jsonb_build_object('id',student_b))),'Head excludes out-of-scope student');
  perform test.login(1);
  directory := public.matt_operation('listAccounts','{"search":"Test Admin","limit":1}');
  perform test.assert(directory->0->'profile'->>'id'=admin_id::text,'admin search and pagination');
  perform test.login(5);
  begin
    perform public.matt_operation('listAccounts');
    raise exception 'student could list accounts';
  exception when sqlstate 'PT403' then null;
  end;
end $$;
