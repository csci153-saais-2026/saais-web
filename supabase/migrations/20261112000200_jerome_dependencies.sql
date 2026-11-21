-- Additive dependencies for the assigned 0.3.0 contract; no rows are removed.
create schema saais_private;
revoke all on schema saais_private from public;
revoke create on schema public from public;

alter table public.faculty add column code text, add column letterhead_prefix text, add column letterhead_name text;
alter table public.department add column code text, add column letterhead_prefix text, add column letterhead_name text;
alter table public.profile add column department_id uuid references public.department(id) on delete restrict,
  add column entry_year integer check (entry_year between 1900 and 3000),
  add column invitation_status text check (invitation_status in ('pending','accepted','declined','expired','revoked')),
  add column invitation_sent_at timestamptz, add column invitation_expires_at timestamptz;
alter table public.profile drop constraint profile_role_fields_valid;
alter table public.profile add constraint profile_role_fields_valid check (
  (role = 'student' and nullif(btrim(student_number), '') is not null and faculty_id is null)
  or (role = 'adviser' and student_number is null and faculty_id is not null)
  or (role in ('admin','dean','department_head','department_staff') and student_number is null)
);
create table public.role_assignment (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profile(id) on delete restrict,
  role public.role_type not null, faculty_id uuid references public.faculty(id) on delete restrict,
  department_id uuid references public.department(id) on delete restrict, created_at timestamptz not null default now(),
  constraint role_assignment_scope check (
    (role in ('student','admin') and faculty_id is null and department_id is null) or
    (role = 'dean' and faculty_id is not null and department_id is null) or
    (role in ('department_head','department_staff') and department_id is not null) or
    (role = 'adviser' and faculty_id is not null)
  ), unique nulls not distinct (profile_id, role, faculty_id, department_id)
);
insert into public.role_assignment(profile_id,role,faculty_id,department_id)
select id,role,case when role='adviser' then faculty_id end,null from public.profile
where role in ('student','adviser','admin');
alter table public.role_assignment enable row level security;

alter table public.course alter column lecture_hours set default 0, alter column lab_hours set default 0,
  add column category text not null default 'major' check (category in ('major','ge','elective','pe','nstp','foundation','service')),
  add column is_elective boolean not null default false;
alter table public.course drop constraint course_units_quarter_step;
alter table public.course add constraint course_units_quarter_step check (units >= 0 and mod(units*4,1)=0);
alter table public.curriculum_version drop constraint curriculum_version_threshold_valid,
  drop constraint curriculum_version_total_units_valid;
alter table public.curriculum_version add constraint curriculum_version_threshold_valid check (delinquency_threshold >= 0 and mod(delinquency_threshold*4,1)=0),
  add constraint curriculum_version_total_units_valid check (total_units >= 0 and mod(total_units*4,1)=0),
  alter column delinquency_threshold set default 0, alter column total_units set default 0;
alter table public.curriculum_term_course add column slot_type text not null default 'required' check (slot_type in ('required','elective','ge','pe','nstp'));
update public.curriculum_term_course set slot_type='elective' where is_elective_slot;
alter table public.curriculum_term_course drop constraint curriculum_slot_units_valid;
alter table public.curriculum_term_course add constraint curriculum_slot_units_valid check (nominal_units >= 0 and mod(nominal_units*4,1)=0);
alter table public.school_term add column starts_on date, add column encoding_deadline date,
  add column closed_by uuid references public.profile(id) on delete restrict, add column closed_at timestamptz,
  add column closure_note text,
  add constraint school_term_dates_ordered check (starts_on is null or starts_on <= ends_on);
alter table public.course_offering add column section text, add column schedule text, add column instructor text;
alter table public.course_offering drop constraint course_offering_term_course_key;
create unique index course_offering_section_key on public.course_offering (school_term_id,course_id,coalesce(lower(btrim(section)),''));

create table public.department_term_encoding (
  id uuid primary key default gen_random_uuid(), school_term_id uuid not null references public.school_term(id) on delete restrict,
  department_id uuid not null references public.department(id) on delete restrict, is_closed boolean not null default false,
  closed_by uuid references public.profile(id) on delete restrict, closed_at timestamptz, closure_note text,
  updated_at timestamptz not null default now(), unique(school_term_id,department_id)
);
create table public.curriculum_pair_equivalence (
  id uuid primary key default gen_random_uuid(), from_curriculum_version_id uuid not null references public.curriculum_version(id) on delete restrict,
  to_curriculum_version_id uuid not null references public.curriculum_version(id) on delete restrict,
  source_course_id uuid not null references public.course(id) on delete restrict, target_course_id uuid not null references public.course(id) on delete restrict,
  note text, created_by uuid not null references public.profile(id) on delete restrict, created_at timestamptz not null default now(),
  check(from_curriculum_version_id <> to_curriculum_version_id),
  unique(from_curriculum_version_id,to_curriculum_version_id,source_course_id),
  unique(from_curriculum_version_id,to_curriculum_version_id,target_course_id)
);
create table public.curriculum_transfer_request (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profile(id) on delete restrict,
  from_curriculum_version_id uuid not null references public.curriculum_version(id) on delete restrict,
  to_curriculum_version_id uuid not null references public.curriculum_version(id) on delete restrict,
  endorsed_by uuid not null references public.profile(id) on delete restrict, endorsement_note text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  decided_by uuid references public.profile(id) on delete restrict, decided_at timestamptz, decision_note text,
  carried_units numeric not null default 0 check(carried_units>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(from_curriculum_version_id <> to_curriculum_version_id),
  check((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null))
);
create unique index curriculum_transfer_one_pending on public.curriculum_transfer_request(student_id) where status='pending';
create table public.outside_credit (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profile(id) on delete restrict,
  entry_type text not null check(entry_type in ('transferee','shiftee')), origin_school text not null,
  original_course_code text not null, original_course_title text not null,
  units numeric not null check(units>0 and mod(units*4,1)=0), grade text not null check(grade ~ '^(?:[12]\.\d{2}|3\.00)$'),
  destination_curriculum_term_course_id uuid not null references public.curriculum_term_course(id) on delete restrict,
  units_credited numeric not null, decided_by uuid not null references public.profile(id) on delete restrict,
  decided_at timestamptz not null default now(), reason text not null,
  revoked_at timestamptz, revoked_by uuid references public.profile(id) on delete restrict, revocation_reason text,
  updated_at timestamptz not null default now(), check(units_credited=units),
  check((revoked_at is null and revoked_by is null and revocation_reason is null) or
    (revoked_at is not null and revoked_by is not null and nullif(btrim(revocation_reason),'') is not null))
);
create unique index outside_credit_live_source on public.outside_credit(student_id,lower(regexp_replace(btrim(origin_school),'\s+',' ','g')),lower(regexp_replace(btrim(original_course_code),'\s+',' ','g'))) where revoked_at is null;
create unique index outside_credit_live_destination on public.outside_credit(student_id,destination_curriculum_term_course_id) where revoked_at is null;
create table public.notification (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profile(id) on delete restrict,
  kind text not null check(kind in ('note','grade','alert','flag','import','person','transfer','report')),
  event_type text not null, title text not null, body text not null, target_route text, target_student_id uuid references public.profile(id) on delete restrict,
  actor_id uuid references public.profile(id) on delete restrict, entity_type text, entity_id uuid, dedupe_key text unique,
  email_delivery_status text check(email_delivery_status in ('pending','sent','skipped','failed')),
  is_read boolean not null default false, read_at timestamptz, created_at timestamptz not null default now()
);
create index notification_recipient_recent on public.notification(recipient_id,created_at desc);
create table public.audit_log_entry (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profile(id) on delete restrict,
  actor_name text, actor_role public.role_type, student_id uuid references public.profile(id) on delete restrict,
  action text not null, action_category text, entity_type text not null, entity_id uuid,
  old_value jsonb, new_value jsonb, reason text, created_at timestamptz not null default now()
);
create table saais_private.credit_history (
  id bigint generated always as identity primary key, entity_type text not null, entity_id uuid not null,
  student_id uuid not null references public.profile(id) on delete restrict, value jsonb not null,
  valid_from timestamptz not null, valid_until timestamptz not null
);
create table saais_private.cache_invalidation (
  student_id uuid primary key references public.profile(id) on delete restrict, revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
-- Settings are dependencies of scheduled alerts, not Matt's settings handlers.
-- No invented institutional thresholds, sender address or backup interval are seeded.
create table public.system_settings (
  id uuid primary key default gen_random_uuid(), department_id uuid unique references public.department(id) on delete restrict,
  warning_pct numeric not null check(warning_pct between 0 and 100), probation_pct numeric not null check(probation_pct between 0 and 100),
  dismissal_pct numeric not null check(dismissal_pct between 0 and 100), sender_email text not null,
  last_backup_at timestamptz, last_backup_by uuid references public.profile(id) on delete restrict,
  last_backup_reference text, last_backup_location text, last_backup_scope text, updated_at timestamptz not null default now()
);
create unique index system_settings_institution on public.system_settings((true)) where department_id is null;
create table saais_private.alert_configuration (
  id boolean primary key default true check(id), backup_overdue_days integer check(backup_overdue_days>0)
);
insert into saais_private.alert_configuration(id) values(true);
create table saais_private.contract (id boolean primary key check(id), document jsonb not null);
create table saais_private.request_budget (
  actor_id uuid not null, window_start timestamptz not null, count integer not null, primary key(actor_id,window_start)
);
alter table public.department_term_encoding enable row level security;
alter table public.curriculum_pair_equivalence enable row level security;
alter table public.curriculum_transfer_request enable row level security;
alter table public.outside_credit enable row level security;
alter table public.notification enable row level security;
alter table public.audit_log_entry enable row level security;
alter table public.system_settings enable row level security;
revoke insert,update,delete,truncate on all tables in schema public from anon,authenticated;
-- Read policies for the added resources are installed with the authorization helpers.
