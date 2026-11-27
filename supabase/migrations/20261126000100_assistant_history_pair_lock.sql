-- Saving an assistant turn must not wait on the global writer lock, which bulk
-- grade imports hold. Lock only this adviser/student pair, and share-lock the
-- open assignment so a concurrent reassignment cannot slip past the check.
create or replace function public.saais_record_assistant_turn(
  p_adviser_id uuid, p_student_id uuid, p_question text, p_answer text
) returns void language plpgsql security definer set search_path=pg_catalog as $$
begin
  perform pg_advisory_xact_lock(
    531202, hashtext(coalesce(p_adviser_id::text, '') || coalesce(p_student_id::text, '')));
  perform 1 from public.adviser_assignment a
    where a.adviser_id=p_adviser_id and a.student_id=p_student_id and a.end_date is null
    for share;
  perform saais_private.assert_assistant_adviser(p_adviser_id, p_student_id);
  if p_question is null or length(p_question) not between 1 and 4000 or btrim(p_question) = ''
    or p_answer is null or length(p_answer) not between 1 and 8000 or btrim(p_answer) = '' then
    perform saais_private.fail(400, 'Invalid assistant conversation.');
  end if;
  insert into saais_private.adviser_assistant_history(adviser_id, student_id, messages)
    values(p_adviser_id, p_student_id, jsonb_build_array(
      jsonb_build_object('role','user','content',p_question),
      jsonb_build_object('role','assistant','content',p_answer)))
  on conflict(adviser_id, student_id) do update set
    messages=(select coalesce(jsonb_agg(item.value order by item.ordinality), '[]'::jsonb)
      from jsonb_array_elements(adviser_assistant_history.messages || excluded.messages)
        with ordinality item(value, ordinality)
      where item.ordinality > greatest(jsonb_array_length(adviser_assistant_history.messages || excluded.messages) - 20, 0)),
    updated_at=clock_timestamp();
end $$;
revoke all on function public.saais_record_assistant_turn(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.saais_record_assistant_turn(uuid, uuid, text, text) to service_role;
