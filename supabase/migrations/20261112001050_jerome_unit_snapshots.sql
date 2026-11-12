-- Contract 0.3.0 permits zero-unit courses (e.g. non-credit requirements).
-- Preserve source snapshots consistently across attempts and credit decisions.
alter table public.attempt drop constraint attempt_units_valid;
alter table public.attempt add constraint attempt_units_valid check(units_attempted>=0 and mod(units_attempted*4,1)=0);
alter table public.elective_mapping drop constraint elective_mapping_units_valid;
alter table public.elective_mapping add constraint elective_mapping_units_valid check(units_credited>=0 and mod(units_credited*4,1)=0);
alter table public.equivalency_decision drop constraint equivalency_units_valid;
alter table public.equivalency_decision add constraint equivalency_units_valid check(units_credited>=0 and mod(units_credited*4,1)=0);
