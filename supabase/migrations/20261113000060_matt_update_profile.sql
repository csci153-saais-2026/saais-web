create function saais_private.matt_normalize_role_assignment(p_assignment jsonb) returns jsonb
language plpgsql stable set search_path = pg_catalog as $$
declare
  role_name public.role_type := (p_assignment->>'role')::public.role_type;
  faculty uuid := (p_assignment->>'faculty_id')::uuid;
  department uuid := (p_assignment->>'department_id')::uuid;
  department_faculty uuid;
begin
  if department is not null then
    select d.faculty_id into department_faculty from public.department d where d.id = department;
    if not found or (faculty is not null and faculty <> department_faculty) then
      perform saais_private.fail(400, 'The department must belong to the selected faculty.');
    end if;
  end if;
  if role_name in ('student','admin') and num_nonnulls(faculty, department) <> 0
    or role_name = 'dean' and (faculty is null or department is not null)
    or role_name in ('department_head','department_staff') and department is null
    or role_name = 'adviser' and coalesce(faculty, department_faculty) is null
    or faculty is not null and not exists (select 1 from public.faculty f where f.id = faculty)
  then
    perform saais_private.fail(400, 'The role assignment has an invalid organizational scope.');
  end if;
  return jsonb_build_object('role', role_name, 'faculty_id', coalesce(faculty, department_faculty),
    'department_id', department);
end;
$$;

create function saais_private.matt_updateprofile(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog as $$
declare
  target_id uuid := (p_params->>'profile_id')::uuid;
  before_profile public.profile%rowtype;
  after_profile public.profile%rowtype;
  old_grants jsonb;
  new_grants jsonb;
  primary_grant jsonb;
  prior_primary_grant jsonb;
  org_changes boolean := p_body ?| array['role','department_id','faculty_id','role_assignments'];
  next_role public.role_type;
  next_status public.profile_status;
  number text;
  candidate jsonb;
  matches integer;
  result jsonb;
  prior jsonb;
begin
  perform saais_private.require_scope(array['admin']);
  select p.* into before_profile from public.profile p where p.id = target_id for update;
  if not found then perform saais_private.fail(404, 'Profile not found.'); end if;
  prior := saais_private.matt_profile(target_id);
  select coalesce(jsonb_agg(g.assignment order by g.assignment), '[]'::jsonb) into old_grants
  from (
    select to_jsonb(r) - array['id','profile_id','created_at'] as assignment
    from public.role_assignment r where r.profile_id = target_id
  ) g;
  new_grants := old_grants;
  next_role := coalesce((p_body->>'role')::public.role_type, before_profile.role);
  next_status := coalesce((p_body->>'status')::public.profile_status, before_profile.status);
  number := case when p_body ? 'student_number' then btrim(p_body->>'student_number') else before_profile.student_number end;

  if next_role = 'student' and (number is null or number !~ '\S')
    or next_role <> 'student' and number is not null
  then
    perform saais_private.fail(400, 'Student numbers belong to accounts with the primary student role.');
  end if;
  if next_status is distinct from before_profile.status and (
    next_status = 'invited' or (next_status = 'active' and
      (before_profile.status = 'invited' or before_profile.invitation_status in ('pending','expired','revoked','declined')))
  ) then
    perform saais_private.fail(409, 'Complete account activation through the invitation flow.');
  end if;

  if org_changes then
    -- A primary role without explicit new scopes keeps its existing grant. An
    -- explicit assignment list replaces the current set, preserving unchanged rows.
    if p_body ? 'role_assignments' then
      select jsonb_agg(g.assignment order by g.assignment) into new_grants from (
        select saais_private.matt_normalize_role_assignment(entry) as assignment
        from jsonb_array_elements(p_body->'role_assignments') entry
      ) g;
      select count(*), (array_agg(entry order by entry))[1] into matches, primary_grant
      from jsonb_array_elements(new_grants) entry
      where entry->>'role' = next_role::text
        and (not p_body ? 'faculty_id' or entry->>'faculty_id' is not distinct from p_body->>'faculty_id')
        and (not p_body ? 'department_id' or entry->>'department_id' is not distinct from p_body->>'department_id');
      if matches > 1 then
        select entry into primary_grant from jsonb_array_elements(new_grants) entry
        where entry->>'role' = next_role::text
          and (entry->>'faculty_id')::uuid is not distinct from before_profile.faculty_id
          and (entry->>'department_id')::uuid is not distinct from before_profile.department_id
          and (not p_body ? 'faculty_id' or entry->>'faculty_id' is not distinct from p_body->>'faculty_id')
          and (not p_body ? 'department_id' or entry->>'department_id' is not distinct from p_body->>'department_id');
      end if;
      if primary_grant is null then
        perform saais_private.fail(400, 'Specify the primary role and its scope in the role assignments.');
      end if;
    else
      select entry into prior_primary_grant from jsonb_array_elements(old_grants) entry
      where entry->>'role' = before_profile.role::text
        and ((entry->>'department_id')::uuid is not distinct from before_profile.department_id or entry->>'department_id' is null)
        and ((entry->>'faculty_id')::uuid is not distinct from before_profile.faculty_id or entry->>'faculty_id' is null)
      order by ((entry->>'department_id')::uuid is not distinct from before_profile.department_id) desc,
        ((entry->>'faculty_id')::uuid is not distinct from before_profile.faculty_id) desc, entry limit 1;

      primary_grant := saais_private.matt_normalize_role_assignment(jsonb_build_object(
        'role', next_role,
        'faculty_id', case when p_body ? 'faculty_id' then p_body->>'faculty_id'
          when next_role = before_profile.role and not p_body ? 'department_id'
          then coalesce(prior_primary_grant->>'faculty_id', before_profile.faculty_id::text) end,
        'department_id', case when p_body ? 'department_id' then p_body->>'department_id'
          when next_role = before_profile.role then coalesce(prior_primary_grant->>'department_id', before_profile.department_id::text) end
      ));
      select coalesce(jsonb_agg(entry order by entry), '[]'::jsonb) into new_grants
      from (
        select entry from jsonb_array_elements(old_grants) entry where entry is distinct from prior_primary_grant
        union select primary_grant
      ) assignments;
    end if;

    if jsonb_array_length(new_grants) > 6 or exists (
      select 1 from jsonb_array_elements(new_grants) entry group by entry having count(*) > 1
    ) then
      perform saais_private.fail(400, 'Provide up to six distinct role assignments.');
    end if;
    if next_role <> 'student' and exists (
      select 1 from jsonb_array_elements(new_grants) entry where entry->>'role' = 'student'
    ) then
      perform saais_private.fail(400, 'A student assignment requires the primary student role.');
    end if;
  end if;

  if target_id = auth.uid() and (next_status <> before_profile.status or next_role <> before_profile.role
    or new_grants is distinct from old_grants) then
    perform saais_private.fail(403, 'You cannot change your own roles or account status.');
  end if;
  if before_profile.role = 'student'
    and (next_role <> before_profile.role or number is distinct from before_profile.student_number)
    and (exists(select 1 from public.student_curriculum_assignment a where a.student_id = target_id)
      or exists(select 1 from public.adviser_assignment a where a.student_id = target_id)
      or exists(select 1 from public.attempt a where a.student_id = target_id)) then
    perform saais_private.fail(409, 'Retain the role and student number used by existing academic records.');
  end if;
  if not exists (select 1 from jsonb_array_elements(new_grants) entry where entry->>'role' = 'adviser')
    and exists (select 1 from public.adviser_assignment a where a.adviser_id = target_id) then
    perform saais_private.fail(409, 'Retain the adviser role linked to assignment history.');
  end if;
  update public.profile p set
    full_name = coalesce(btrim(p_body->>'full_name'), p.full_name),
    role = next_role, status = next_status, student_number = number,
    faculty_id = case when org_changes then (primary_grant->>'faculty_id')::uuid else p.faculty_id end,
    department_id = case when org_changes then (primary_grant->>'department_id')::uuid else p.department_id end,
    avatar_url = case when p_body ? 'avatar_url' then p_body->>'avatar_url' else p.avatar_url end,
    consultation_hours = case when p_body ? 'consultation_hours' then p_body->>'consultation_hours' else p.consultation_hours end,
    updated_at = clock_timestamp()
  where p.id = target_id returning * into after_profile;

  if new_grants is distinct from old_grants then
    delete from public.role_assignment r where r.profile_id = target_id
      and not new_grants @> jsonb_build_array(to_jsonb(r) - array['id','profile_id','created_at']);
    for candidate in select entry from jsonb_array_elements(new_grants) entry
      where not old_grants @> jsonb_build_array(entry)
    loop
      insert into public.role_assignment (profile_id, role, faculty_id, department_id)
      values (target_id, (candidate->>'role')::public.role_type,
        (candidate->>'faculty_id')::uuid, (candidate->>'department_id')::uuid);
    end loop;
  end if;
  result := saais_private.matt_profile(after_profile.id);
  insert into public.audit_log_entry (
    actor_id, actor_name, actor_role, student_id, action, action_category,
    entity_type, entity_id, old_value, new_value
  )
  select a.id, a.full_name, 'admin', case when next_role = 'student' then after_profile.id end,
    'updateProfile', 'change', 'profile', after_profile.id,
    prior || jsonb_build_object('role_assignments', old_grants),
    result || jsonb_build_object('role_assignments', new_grants)
  from public.profile a where a.id = auth.uid();
  return result;
end;
$$;

revoke all on function saais_private.matt_normalize_role_assignment(jsonb),
  saais_private.matt_updateprofile(jsonb, jsonb) from public, anon, authenticated;
