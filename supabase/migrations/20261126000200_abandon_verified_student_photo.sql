-- Invalidate a one-use photo token before deleting its object. A concurrent
-- upload transaction locks the same row: a committed upload consumes it,
-- while a rollback leaves it available for safe cleanup.
create function public.saais_abandon_verified_photo(p_path text) returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
begin
  delete from saais_private.verified_student_photo where object_path = p_path;
  return found;
end $$;
revoke all on function public.saais_abandon_verified_photo(text) from public, anon, authenticated;
grant execute on function public.saais_abandon_verified_photo(text) to service_role;
