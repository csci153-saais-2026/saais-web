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
