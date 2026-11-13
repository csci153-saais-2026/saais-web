create function saais_private.matt_photo_target(p_id uuid) returns public.profile
language plpgsql set search_path=pg_catalog,public as $$
declare profile public.profile;
begin
  if not saais_private.has_role('admin') and (p_id<>auth.uid() or not saais_private.has_role('student')) then
    perform saais_private.fail(403,'The student is outside your authorized scope.');
  end if;
  select p.* into profile from public.profile p where p.id=p_id and p.role='student' for update;
  if not found then perform saais_private.fail(404,'Student not found.'); end if;
  return profile;
end $$;

create function saais_private.matt_deletestudentphoto(p_params jsonb,p_body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare profile public.profile:=saais_private.matt_photo_target((p_params->>'student_id')::uuid);
begin
  if profile.avatar_url is not null then
    update public.profile p set avatar_url=null,updated_at=clock_timestamp() where p.id=profile.id;
    perform saais_private.audit('student_photo_deleted','profile',profile.id,
      jsonb_build_object('has_photo',true),jsonb_build_object('has_photo',false),profile.id);
  end if;
  return saais_private.matt_profile(profile.id);
end $$;

create function saais_private.matt_uploadstudentphoto(p_params jsonb,p_body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare
  profile public.profile:=saais_private.matt_photo_target((p_params->>'student_id')::uuid);
  object_key text:=p_body->>'storage_object_path';
  object_metadata jsonb;
  avatar text := '/storage/v1/object/authenticated/student-photos/' || object_key;
begin
  if object_key is null or left(object_key,length('students/'||profile.id||'/')) <> 'students/'||profile.id||'/'
    or object_key !~ '^[a-zA-Z0-9._/-]+$' or object_key ~ '(^|/)(\.{1,2})(/|$)'
    or split_part(split_part(p_body->>'avatar_url','?',1),'/student-photos/',2)<>object_key then
    perform saais_private.fail(400,'Provide the stored photo object path and its URL.');
  end if;
  execute 'select metadata from storage.objects where bucket_id=$1 and name=$2 for share'
    into object_metadata using 'student-photos',object_key;
  if object_metadata is null or object_metadata->>'mimetype' is distinct from p_body->>'mime_type'
    or object_metadata->>'size' is distinct from p_body->>'file_size_bytes' then
    perform saais_private.fail(400,'Stored photo metadata does not match the request.');
  end if;
  -- Store a same-origin resource path without persisting a signed URL token.
  update public.profile p set avatar_url=avatar,updated_at=clock_timestamp() where p.id=profile.id;
  perform saais_private.audit('student_photo_updated','profile',profile.id,
    jsonb_build_object('has_photo',profile.avatar_url is not null),jsonb_build_object('has_photo',true),profile.id);
  return saais_private.matt_profile(profile.id);
end $$;
