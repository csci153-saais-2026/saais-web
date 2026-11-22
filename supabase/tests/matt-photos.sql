create schema if not exists storage;
create table if not exists storage.objects(bucket_id text, name text, metadata jsonb);

do $$
declare
  student uuid := '00000005-0000-4000-8000-000000000000';
  path text := 'students/'||student||'/avatar.png';
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
  profile := public.matt_operation('uploadStudentPhoto',params,body);
  perform test.assert(profile->>'avatar_url'='/storage/v1/object/authenticated/student-photos/'||path,'photo saved');
  profile := public.matt_operation('deleteStudentPhoto',params);
  perform test.assert(profile->>'avatar_url' is null,'photo cleared');
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
  if (select count(*) from storage.objects where bucket_id = 'student-photos' and name like '%/test.png') <> 1 then
    raise exception 'Student photo visibility must be limited to the student';
  end if;
  if not saais_private.can_use_student_photo('students/' || auth.uid() || '/new.png', true) then
    raise exception 'Student cannot upload their photo';
  end if;
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
