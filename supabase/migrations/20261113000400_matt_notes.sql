create table public.advising_note (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profile(id),
  authored_by uuid not null references public.profile(id),
  author_name text,
  author_role_label text,
  body_text text not null check (char_length(body_text)<=8000 and body_text ~ '\S'),
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profile(id),
  created_at timestamptz not null default now(),
  check ((is_archived and archived_at is not null and archived_by is not null)
    or (not is_archived and archived_at is null and archived_by is null))
);
create index advising_note_student on public.advising_note(student_id,created_at,id);
alter table public.advising_note enable row level security;
revoke all on public.advising_note from anon,authenticated;

create function saais_private.matt_addadvisingnote(p_params jsonb,p_body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare
  target uuid := (p_params->>'student_id')::uuid;
  note public.advising_note;
begin
  perform saais_private.student_access(target,array['adviser','admin']);
  insert into public.advising_note(student_id,authored_by,author_name,author_role_label,body_text)
    select target,p.id,left(p.full_name,150),
      case current_setting('saais.authorized_role') when 'adviser' then 'Adviser' else 'System Admin' end,
      p_body->>'body_text' from public.profile p where p.id=auth.uid()
    returning * into note;
  perform saais_private.audit('advising_note_added','advising_note',note.id,null,
    jsonb_build_object('is_archived',false),target);
  return to_jsonb(note);
end $$;

create function saais_private.matt_updateadvisingnotearchivestate(p_params jsonb,p_body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare
  target uuid := (p_params->>'student_id')::uuid;
  note public.advising_note;
  archive boolean := (p_body->>'is_archived')::boolean;
begin
  perform saais_private.student_access(target,array['adviser','admin']);
  select n.* into note from public.advising_note n
    where n.student_id=target and n.id=(p_params->>'note_id')::uuid for update;
  if not found then perform saais_private.fail(404,'Advising note not found.'); end if;
  if note.is_archived=archive then return to_jsonb(note); end if;
  update public.advising_note set is_archived=archive,
    archived_at=case when archive then clock_timestamp() end,
    archived_by=case when archive then auth.uid() end
    where id=note.id returning * into note;
  perform saais_private.audit(case when archive then 'advising_note_archived' else 'advising_note_restored' end,
    'advising_note',note.id,jsonb_build_object('is_archived',not archive),jsonb_build_object('is_archived',archive),target);
  return to_jsonb(note);
end $$;

revoke all on public.attempt_remark from anon,authenticated;

create function saais_private.matt_addattemptremark(p_params jsonb,p_body jsonb) returns jsonb
language plpgsql set search_path=pg_catalog,public as $$
declare
  target uuid := (p_params->>'student_id')::uuid;
  attempt_id uuid := (p_body->>'attempt_id')::uuid;
  slot_id uuid := (p_body->>'curriculum_term_course_id')::uuid;
  remark public.attempt_remark;
begin
  perform saais_private.student_access(target,array['adviser','admin']);
  if num_nonnulls(attempt_id,slot_id)<>1 then
    perform saais_private.fail(400,'Provide exactly one attempt or curriculum slot.');
  elsif attempt_id is not null and not exists(select 1 from public.attempt a where a.id=attempt_id and a.student_id=target) then
    perform saais_private.fail(404,'Student attempt not found.');
  elsif slot_id is not null and not exists (
    select 1 from public.student_curriculum_assignment a
    join public.curriculum_term t on t.curriculum_version_id=a.curriculum_version_id
    join public.curriculum_term_course s on s.curriculum_term_id=t.id
    where a.student_id=target and s.id=slot_id
  ) then perform saais_private.fail(404,'Student curriculum slot not found.'); end if;
  insert into public.attempt_remark(student_id,authored_by,body_text,attempt_id,curriculum_term_course_id)
    values(target,auth.uid(),p_body->>'body_text',attempt_id,slot_id) returning * into remark;
  perform saais_private.audit('attempt_remark_added','attempt_remark',remark.id,null,
    jsonb_build_object('attempt_id',attempt_id,'curriculum_term_course_id',slot_id),target);
  return to_jsonb(remark);
end $$;
