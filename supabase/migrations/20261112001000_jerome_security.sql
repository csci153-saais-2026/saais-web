-- No direct writes to academic resources, including tables added after the
-- initial privilege migration. Private helpers are never exposed as RPCs.
revoke insert,update,delete,truncate on all tables in schema public from anon,authenticated;
revoke all on all tables in schema saais_private from public,anon,authenticated;
revoke all on all functions in schema saais_private from public,anon,authenticated;
alter default privileges in schema saais_private revoke execute on functions from public;

create function saais_private.immutable_audit() returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception using errcode='PT403',message='Audit history is append-only.'; end $$;
create trigger audit_is_immutable before update or delete on public.audit_log_entry for each row execute function saais_private.immutable_audit();
create trigger credit_history_is_immutable before update or delete on saais_private.credit_history for each row execute function saais_private.immutable_audit();
create trigger audit_cannot_be_truncated before truncate on public.audit_log_entry for each statement execute function saais_private.immutable_audit();
create trigger credit_history_cannot_be_truncated before truncate on saais_private.credit_history for each statement execute function saais_private.immutable_audit();

-- A future enrollment/grade writer cannot race a credit decision into counting
-- the same source or destination twice. Both lock the student's profile first.
create function saais_private.assert_direct_credit(student uuid, attempt uuid, slot uuid) returns void language plpgsql set search_path=pg_catalog,public as $$
begin
  if exists(select 1 from public.elective_mapping m where m.student_id=student and m.revoked_at is null and (m.attempt_id=attempt or m.curriculum_term_course_id=slot)) or
    exists(select 1 from public.equivalency_decision e where e.student_id=student and e.revoked_at is null and (e.attempt_id=attempt or e.destination_curriculum_term_course_id=slot)) or
    exists(select 1 from public.outside_credit c where c.student_id=student and c.revoked_at is null and c.destination_curriculum_term_course_id=slot) or
    exists(select 1 from public.attempt a where a.student_id=student and a.id<>attempt and a.curriculum_term_course_id=slot and saais_private.passed(a.id)) then
    perform saais_private.fail(409,'A live credit already satisfies this source or destination.'); end if;
end $$;
create function saais_private.direct_credit_guard() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare org jsonb; effective_pass boolean;
begin
  perform 1 from public.profile p where p.id=new.student_id for update;
  org:=saais_private.organization(new.student_id);
  effective_pass:=new.status='passed' or (new.status='inc' and exists(select 1 from public.inc_resolution i where i.attempt_id=new.id and i.completion_grade<=3));
  if effective_pass and new.curriculum_term_course_id is not null and exists(select 1 from public.curriculum_term_course s join public.curriculum_term t on t.id=s.curriculum_term_id
    where s.id=new.curriculum_term_course_id and t.curriculum_version_id=(org->>'curriculum_version_id')::uuid) then
    perform saais_private.assert_direct_credit(new.student_id,new.id,new.curriculum_term_course_id);
  end if;
  return new;
end $$;
create trigger direct_attempt_credit_guard before insert or update on public.attempt for each row execute function saais_private.direct_credit_guard();
create function saais_private.inc_direct_credit_guard() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare a public.attempt;
begin
  perform 1 from public.profile p where p.id=new.student_id for update;
  select aa.* into a from public.attempt aa where aa.id=new.attempt_id and aa.student_id=new.student_id for share;
  if new.completion_grade<=3 and a.curriculum_term_course_id is not null and exists(
    select 1 from public.curriculum_term_course s join public.curriculum_term t on t.id=s.curriculum_term_id
    where s.id=a.curriculum_term_course_id and t.curriculum_version_id=(saais_private.organization(new.student_id)->>'curriculum_version_id')::uuid) then
    perform saais_private.assert_direct_credit(new.student_id,a.id,a.curriculum_term_course_id);
  end if;
  return new;
end $$;
create trigger inc_completion_credit_guard before insert or update on public.inc_resolution for each row execute function saais_private.inc_direct_credit_guard();

-- Safe ownership checks for the two shared reads needed to consume these
-- functions. Other /rest reads remain the team's separate Data API work.
create function saais_private.own_active_record(profile uuid) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin return profile=saais_private.actor(); exception when sqlstate 'PT401' or sqlstate 'PT403' then return false; end $$;
grant usage on schema saais_private to authenticated;
grant execute on function saais_private.own_active_record(uuid) to authenticated;
grant select on public.notification,public.role_assignment to authenticated;
create policy own_notifications on public.notification for select to authenticated using(saais_private.own_active_record(recipient_id));
create policy own_roles on public.role_assignment for select to authenticated using(saais_private.own_active_record(profile_id));
revoke all on function saais_private.immutable_audit(),saais_private.direct_credit_guard(),saais_private.assert_direct_credit(uuid,uuid,uuid),saais_private.inc_direct_credit_guard() from public,anon,authenticated;
