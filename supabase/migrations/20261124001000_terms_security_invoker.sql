create function saais_private.term_display(p_term uuid)
returns table(closed_by_name text, department_closures jsonb)
language sql stable security definer set search_path = pg_catalog as $$
  select left(closer.full_name, 150),
    (select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'school_term_id', c.school_term_id, 'department_id', c.department_id,
      'is_closed', c.is_closed, 'closed_by', c.closed_by, 'closed_at', c.closed_at,
      'closure_note', c.closure_note, 'updated_at', c.updated_at
    ) order by c.department_id), '[]'::jsonb)
    from public.department_term_encoding c where c.school_term_id = r.id)
  from public.school_term r left join public.profile closer on closer.id = r.closed_by
  where r.id = p_term and saais_private.own_active_record(auth.uid());
$$;
create function saais_private.encoding_closer_name(p_encoding uuid) returns text
language sql stable security definer set search_path = pg_catalog as $$
  select left(closer.full_name, 150) from public.department_term_encoding r
  left join public.profile closer on closer.id = r.closed_by
  where r.id = p_encoding and saais_private.own_active_record(auth.uid());
$$;
revoke all on function saais_private.term_display(uuid), saais_private.encoding_closer_name(uuid) from public, anon, authenticated;
grant execute on function saais_private.term_display(uuid), saais_private.encoding_closer_name(uuid) to authenticated;

grant select (id, start_year, end_year, term_type, school_year, is_locked, override_flag,
  override_actor_id, override_at, starts_on, ends_on, encoding_deadline, closed_by,
  closed_at, closure_note, default_inc_deadline, chronological_key) on public.school_term to authenticated;
grant select (id, school_term_id, department_id, is_closed, closed_by, updated_at, closed_at, closure_note)
  on public.department_term_encoding to authenticated;
create policy api_school_term_read on public.school_term for select to authenticated using (saais_private.own_active_record(auth.uid()));
create policy api_department_encoding_read on public.department_term_encoding for select to authenticated using (saais_private.own_active_record(auth.uid()));

create or replace view saais_api.school_term with (security_barrier = true, security_invoker = true) as
select r.id, r.start_year, r.end_year, r.term_type, r.school_year, r.is_locked, r.override_flag,
  r.override_actor_id, r.override_at, r.starts_on, r.ends_on, r.encoding_deadline, r.closed_by,
  display.closed_by_name, r.closed_at, r.closure_note, display.department_closures,
  r.default_inc_deadline, r.chronological_key
from public.school_term r cross join lateral saais_private.term_display(r.id) display
where saais_private.own_active_record(auth.uid());

create or replace view saais_api.department_term_encoding with (security_barrier = true, security_invoker = true) as
select r.id, r.school_term_id, r.department_id, r.is_closed, r.closed_by,
  saais_private.encoding_closer_name(r.id) as closed_by_name, r.updated_at, r.closed_at, r.closure_note
from public.department_term_encoding r where saais_private.own_active_record(auth.uid());
