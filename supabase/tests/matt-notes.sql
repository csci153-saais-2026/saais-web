select test.login(1);
do $$
declare
  target uuid := '00000005-0000-4000-8000-000000000000';
  path jsonb := jsonb_build_object('student_id',target);
  note jsonb;
  slot uuid;
begin
  select s.id into strict slot from public.curriculum_term_course s
    join public.curriculum_term t on t.id=s.curriculum_term_id
    join public.student_curriculum_assignment a on a.curriculum_version_id=t.curriculum_version_id
    where a.student_id=target and a.end_date is null limit 1;
  note := public.matt_operation('addAdvisingNote',path,'{"body_text":"Discuss next term."}');
  perform test.assert(note->>'student_id'=target::text,'note student');
  path := path || jsonb_build_object('note_id',note->>'id');
  note := public.matt_operation('updateAdvisingNoteArchiveState',path,'{"is_archived":true}');
  perform test.assert(note->>'body_text'='Discuss next term.' and note->>'is_archived'='true','archive without changing body');
  note := public.matt_operation('updateAdvisingNoteArchiveState',path,'{"is_archived":false}');
  perform test.assert(note->>'is_archived'='false' and note->>'archived_at' is null,'restore clears archive metadata');
  note := public.matt_operation('addAttemptRemark',path-'note_id',
    jsonb_build_object('body_text','Internal note.','curriculum_term_course_id',slot));
  perform test.assert(note->>'curriculum_term_course_id'=slot::text,'empty slot remark');
  perform test.assert(not has_table_privilege('authenticated','public.attempt_remark','SELECT'),'remarks are private');
  perform test.login(5);
  begin
    perform public.matt_operation('addAttemptRemark',path-'note_id',
      jsonb_build_object('body_text','Internal note.','curriculum_term_course_id',slot));
    raise exception 'student could create a staff remark';
  exception when sqlstate 'PT403' then null;
  end;
end $$;
