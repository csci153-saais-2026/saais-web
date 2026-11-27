create function test.reject_late_event() returns trigger language plpgsql as $$begin
  if current_setting('test.reject_late_event',true)='true' and new.event_type='curriculum_reassigned' then
    raise exception using errcode='PT409',message='Injected late failure'; end if; return new;
end$$;
create trigger inject_late_failure before insert on public.notification for each row execute function test.reject_late_event();
do $$declare student uuid:='00000009-0000-4000-8000-000000000000'; before_org jsonb; before_audit bigint; before_assignment bigint; before_notifications bigint; version uuid; transfer jsonb;
begin
  perform test.login(8);
  before_org:=saais_private.organization(student);
  select (value->>'id')::uuid into version from test.records where name='version_b';
  transfer:=test.call('endorseCurriculumTransfer',jsonb_build_object('student_id',student),jsonb_build_object('to_curriculum_version_id',version,'endorsement_note','Rollback approval test'));
  perform test.login(2);
  select count(*) into before_audit from public.audit_log_entry;
  select count(*) into before_assignment from public.student_curriculum_assignment;
  select count(*) into before_notifications from public.notification;
  perform set_config('test.reject_late_event','true',true);
  perform test.expect('PT409','decideCurriculumTransfer',jsonb_build_object('transfer_id',transfer->>'id'),'{"decision":"approved"}');
  perform set_config('test.reject_late_event','false',true);
  perform test.assert(saais_private.organization(student)=before_org,'late failure did not roll back assignment');
  perform test.assert((select count(*)=before_assignment from public.student_curriculum_assignment),'partial assignment row survived');
  perform test.assert((select count(*)=before_audit from public.audit_log_entry),'partial audit survived');
  perform test.assert((select count(*)=before_notifications from public.notification),'partial notification survived');
  perform test.assert((select t.status='pending' from public.curriculum_transfer_request t where t.id=(transfer->>'id')::uuid),'failed approval changed transfer status');
  perform test.call('decideCurriculumTransfer',jsonb_build_object('transfer_id',transfer->>'id'),'{"decision":"rejected","decision_note":"Clean up rollback test"}');
end$$;
drop trigger inject_late_failure on public.notification;
