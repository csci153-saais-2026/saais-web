-- The result projection reads the scoped student_organization view and an
-- independently authorized helper; it does not require access to base tables.
-- Keep the existing security barrier and caller-facing grants unchanged.
alter view saais_api.attempt_result set (security_invoker = true);
