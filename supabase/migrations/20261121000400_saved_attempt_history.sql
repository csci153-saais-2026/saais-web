-- Approved FR-ENR-06: saved attempts remain part of academic history.
-- Both direct deletion and encoding-workspace removal use this guard.
create or replace function saais_private.matt_remove_attempt(p_attempt public.attempt) returns void
language plpgsql set search_path = pg_catalog, public as $$
begin
  perform saais_private.matt_grade_conflict(
    'ATTEMPT_HISTORY_IMMUTABLE',
    'Saved course attempts cannot be deleted. Record a drop as DR or use the authorized correction workflow.'
  );
end
$$;

create or replace function saais_private.matt_deleteopentermattempt(p_params jsonb, p_body jsonb) returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  v_student_id uuid := (p_params->>'student_id')::uuid;
  v_attempt public.attempt;
begin
  perform saais_private.matt_grade_student(v_student_id);
  v_attempt := saais_private.matt_grade_attempt(v_student_id, (p_params->>'attempt_id')::uuid);
  perform saais_private.matt_remove_attempt(v_attempt);
  return null;
end
$$;
