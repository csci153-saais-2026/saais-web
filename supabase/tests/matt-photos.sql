create schema if not exists storage;
create table if not exists storage.objects(bucket_id text, name text, metadata jsonb);

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  path text := 'students/'||student||'/avatar.png';
  verified text := 'students/'||student||'/validated-00000000-0000-4000-8000-000000000001.png';
  unused text := 'students/'||student||'/validated-00000000-0000-4000-8000-000000000002.png';
  url text := 'https://supabase.test/storage/v1/object/sign/student-photos/'||path;
  params jsonb := jsonb_build_object('student_id',student);
  body jsonb := jsonb_build_object('avatar_url',url,'storage_object_path',path,'mime_type','image/png','file_size_bytes',11);
  profile jsonb;
begin
  insert into storage.objects(bucket_id,name,metadata) values('student-photos',path,'{"mimetype":"image/png","size":11}');
  perform test.login(5);
  begin
    perform public.matt_operation('uploadStudentPhoto',params,body||'{"file_size_bytes":12}');
    raise exception 'wrong size accepted';
  exception when sqlstate 'PT400' then null;
  end;
  begin
    perform public.matt_operation('uploadStudentPhoto',params,body);
    raise exception 'unvalidated photo accepted';
  exception when sqlstate 'PT400' then null;
  end;
  insert into storage.objects(bucket_id,name,metadata) values('student-photos',verified,'{"mimetype":"image/png","size":5242880}');
  perform public.saais_register_verified_photo(student,student,verified);
  body := jsonb_build_object('avatar_url','/student-photos/'||verified,'storage_object_path',verified,'mime_type','image/png','file_size_bytes',5242880);
  profile := public.matt_operation('uploadStudentPhoto',params,body);
  perform test.assert(not public.saais_abandon_verified_photo(verified),'committed photo token cannot be abandoned');
  perform test.assert(profile->>'avatar_url'='/storage/v1/object/authenticated/student-photos/'||verified,'verified 5 MiB photo saved');
  begin
    perform public.matt_operation('uploadStudentPhoto',params,body);
    raise exception 'validation was reused';
  exception when sqlstate 'PT400' then null;
  end;
  insert into storage.objects(bucket_id,name,metadata) values('student-photos',unused,'{"mimetype":"image/png","size":5242880}');
  perform public.saais_register_verified_photo(student,student,unused);
  perform test.assert(public.saais_abandon_verified_photo(unused),'unused photo token can be abandoned');
  perform test.assert(not public.saais_abandon_verified_photo(unused),'abandoned token cannot be reused');
  body := jsonb_build_object('avatar_url','/student-photos/'||unused,'storage_object_path',unused,'mime_type','image/png','file_size_bytes',5242880);
  begin
    perform public.matt_operation('uploadStudentPhoto',params,body);
    raise exception 'abandoned validation was accepted';
  exception when sqlstate 'PT400' then null;
  end;
  profile := public.matt_operation('deleteStudentPhoto',params);
  perform test.assert(profile->>'avatar_url' is null,'photo cleared');
  perform test.assert(public.saais_reconcile_deleted_photos(student) = array[verified],
    'deleted student photo path is queued for storage reconciliation');
  perform test.assert(public.saais_reconcile_deleted_photos(student, array[verified]) = '{}'::text[],
    'acknowledged storage removal clears the reconciliation queue');
  -- Simulate a delete followed by a concurrent upload referencing the same path:
  -- reconciliation must never return an actively referenced avatar.
  update public.profile set avatar_url = '/storage/v1/object/authenticated/student-photos/' || verified where id = student;
  insert into saais_private.deleted_student_photo(object_path, student_id) values (verified, student);
  perform test.assert(public.saais_reconcile_deleted_photos(student) = '{}'::text[],
    'reconciliation never returns an actively referenced avatar');
  update public.profile set avatar_url = null where id = student;
  perform test.login(9);
  begin
    perform public.matt_operation('deleteStudentPhoto',params);
    raise exception 'cross-student deletion was allowed';
  exception when sqlstate 'PT403' then null;
  end;
end $$;

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  other uuid := '00000009-0000-4000-8000-000000000000';
  own_path text := 'students/' || student || '/test.png';
  other_path text := 'students/' || other || '/test.png';
begin
  insert into storage.objects(bucket_id, name) values
    ('student-photos', own_path), ('student-photos', other_path);
end;
$$;
select test.login(5);
set local role authenticated;
do $$begin
  if not public.saais_photo_upload_authorize(auth.uid(), 'students/' || auth.uid() || '/new.png') then
    raise exception 'Student could not authorize their own staged photo';
  end if;
  begin
    perform public.saais_photo_upload_authorize('00000009-0000-4000-8000-000000000000',
      'students/00000009-0000-4000-8000-000000000000/new.png');
    raise exception 'Student authorized another student photo';
  exception when sqlstate 'PT403' then null;
  end;
  if (select count(*) from storage.objects where bucket_id = 'student-photos' and name like '%/test.png') <> 1 then
    raise exception 'Student photo visibility must be limited to the student';
  end if;
  if not saais_private.can_use_student_photo('students/' || auth.uid() || '/new.png', true) then
    raise exception 'Student cannot upload their photo';
  end if;
  if saais_private.can_use_student_photo('students/' || auth.uid() || '/validated-00000000-0000-4000-8000-000000000001.png', true) then
    raise exception 'Student can overwrite a validated photo';
  end if;
  if has_function_privilege(current_user, 'public.saais_abandon_verified_photo(text)', 'EXECUTE') then
    raise exception 'Student can abandon photo validation';
  end if;
  if has_function_privilege(current_user, 'public.saais_register_verified_photo(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'Student can forge photo validation';
  end if;
  if has_function_privilege(current_user, 'public.saais_reconcile_deleted_photos(uuid,text[])', 'EXECUTE') then
    raise exception 'Student can access service-only photo reconciliation';
  end if;
  begin
    insert into storage.objects(bucket_id, name) values
      ('student-photos', 'students/00000005-0000-4000-8000-000000000000/validated-00000000-0000-4000-8000-000000000002.png');
    raise exception 'Student created a trusted photo directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.matt_operation('uploadStudentPhoto',
      '{"student_id":"00000005-0000-4000-8000-000000000000"}'::jsonb,
      '{"avatar_url":"/student-photos/students/00000005-0000-4000-8000-000000000000/avatar.png","storage_object_path":"students/00000005-0000-4000-8000-000000000000/avatar.png","mime_type":"image/png","file_size_bytes":11}'::jsonb);
    raise exception 'Direct RPC accepted an unvalidated photo';
  exception when sqlstate 'PT400' then null;
  end;
  if saais_private.can_use_student_photo('students/not-a-uuid/a.png', false) then
    raise exception 'Malformed paths cannot grant access';
  end if;
  begin
    insert into storage.objects(bucket_id, name) values
      ('student-photos', 'students/00000009-0000-4000-8000-000000000000/spoof.png');
    raise exception 'Student uploaded another student photo';
  exception when insufficient_privilege then null;
  end;
end$$;
reset role;
select test.login(4);
set local role authenticated;
do $$begin
  if (select count(*) from storage.objects where bucket_id = 'student-photos' and name like '%/test.png') <> 1 then
    raise exception 'Adviser photo reads must follow current assignments';
  end if;
  delete from storage.objects where bucket_id = 'student-photos';
  if found then
    raise exception 'Adviser deleted another user photo';
  end if;
end$$;
reset role;
