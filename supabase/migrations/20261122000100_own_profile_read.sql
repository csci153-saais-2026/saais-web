-- Authentication hydration needs the caller's own active profile. Reuse the
-- same active-session boundary as the existing role and notification reads.
grant select on public.profile to authenticated;
create policy own_profile on public.profile for select to authenticated
  using (saais_private.own_active_record(id));
