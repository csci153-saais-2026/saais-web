insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-photos', 'student-photos', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function saais_private.student_photo_owner(p_path text) returns uuid
language sql immutable set search_path = pg_catalog as $$
  select case
    when p_path ~ '^students/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-zA-Z0-9._-]+$'
      and split_part(p_path, '/', 3) not in ('.', '..')
    then split_part(p_path, '/', 2)::uuid
  end;
$$;

create function saais_private.can_use_student_photo(p_path text, p_write boolean) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists (
    select 1 from public.profile p
    where p.id = saais_private.student_photo_owner(p_path) and p.role = 'student'
      and saais_private.can_read_student(p.id,
        case when p_write then array['student', 'admin']
          else array['student', 'adviser', 'department_head', 'department_staff', 'dean', 'admin'] end,
        false)
  );
$$;

revoke all on function saais_private.student_photo_owner(text),
  saais_private.can_use_student_photo(text,boolean) from public, anon, authenticated;
grant execute on function saais_private.can_use_student_photo(text,boolean) to authenticated;

-- Restrictive policies also apply if the deployment has broader Storage
-- policies for other buckets.
create policy student_photo_read on storage.objects for select to authenticated
  using (bucket_id = 'student-photos' and saais_private.can_use_student_photo(name, false));
create policy student_photo_read_scope on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'student-photos' or saais_private.can_use_student_photo(name, false));
create policy student_photo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos' and saais_private.can_use_student_photo(name, true));
create policy student_photo_insert_scope on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'student-photos' or saais_private.can_use_student_photo(name, true));
create policy student_photo_update on storage.objects for update to authenticated
  using (bucket_id = 'student-photos' and saais_private.can_use_student_photo(name, true))
  with check (bucket_id = 'student-photos' and saais_private.can_use_student_photo(name, true));
create policy student_photo_update_scope on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'student-photos' or saais_private.can_use_student_photo(name, true))
  with check (bucket_id <> 'student-photos' or saais_private.can_use_student_photo(name, true));
create policy student_photo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'student-photos' and saais_private.can_use_student_photo(name, true));
create policy student_photo_delete_scope on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'student-photos' or saais_private.can_use_student_photo(name, true));
create policy student_photo_anon_scope on storage.objects as restrictive for all to anon
  using (bucket_id <> 'student-photos') with check (bucket_id <> 'student-photos');
