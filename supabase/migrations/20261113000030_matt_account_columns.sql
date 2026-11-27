alter table public.profile
  add column avatar_url text check (char_length(avatar_url)<=2048),
  add column consultation_hours text check (char_length(consultation_hours)<=250);

create function saais_private.matt_profile(p_id uuid) returns jsonb
language sql stable set search_path=pg_catalog,public as $$
  select saais_private.project(to_jsonb(p) || jsonb_build_object('roles',
    coalesce((select jsonb_agg(distinct r.role order by r.role) from public.role_assignment r where r.profile_id=p.id),'[]')),
    '{"$ref":"#/components/schemas/Profile"}')
  from public.profile p where p.id=p_id;
$$;
