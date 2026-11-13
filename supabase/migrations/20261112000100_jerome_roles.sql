-- The six preceding 20261009 migrations are reused unchanged from
-- origin/supabase/migrations at ec38495 (team schema work).
-- Enum additions need their own committed migration before use below.
alter type public.role_type add value if not exists 'department_head';
alter type public.role_type add value if not exists 'department_staff';
alter type public.role_type add value if not exists 'dean';
