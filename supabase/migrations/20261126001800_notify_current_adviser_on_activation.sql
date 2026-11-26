-- Provisioning alerts the adviser on the first assignment. Activation alerts the
-- student about the current assignment, including a reassignment made while invited.
create or replace function saais_private.notify_initial_adviser() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  if new.end_date is null
    and exists(select 1 from public.profile p where p.id=new.student_id and p.status='invited')
    and not exists(select 1 from public.adviser_assignment a where a.student_id=new.student_id and a.id<>new.id)
  then
    perform saais_private.notify('adviser_assigned','person',array[new.adviser_id],
      'adviser_assignment',new.id,new.student_id);
  end if;
  return new;
end $$;

create or replace function saais_private.notify_invitation_accepted() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare v_department uuid; v_assignment public.adviser_assignment;
begin
  if old.status = 'invited' and new.status = 'active' and new.invitation_status = 'accepted' then
    v_department := coalesce((saais_private.organization(new.id)->>'department_id')::uuid, new.department_id,
      (select r.department_id from public.role_assignment r where r.profile_id=new.id and r.department_id is not null order by r.created_at,r.id limit 1));
    perform saais_private.notify('invitation_accepted','person',
      saais_private.recipients(v_department,array['admin','department_head','department_staff']),
      'profile',new.id,case when new.role='student' then new.id end);
    select * into v_assignment from public.adviser_assignment a
      where a.student_id=new.id and a.end_date is null;
    if found then
      perform saais_private.notify('adviser_assigned','person',array[new.id],
        'adviser_assignment',v_assignment.id,new.id);
    end if;
  end if;
  return new;
end $$;
