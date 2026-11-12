-- SAAIS V3 identity.
-- Shared enum types must precede all application tables.
CREATE TYPE role_type AS ENUM ('student', 'adviser', 'admin');
CREATE TYPE profile_status AS ENUM ('invited', 'active', 'disabled');
CREATE TYPE program_status AS ENUM ('active', 'archived');
CREATE TYPE curriculum_version_status AS ENUM ('draft', 'active', 'teach_out', 'closed');
CREATE TYPE course_status AS ENUM ('active', 'discontinued');
CREATE TYPE repeatable_type AS ENUM ('none', 'grade_replacement', 'additional_credit');
CREATE TYPE prerequisite_type AS ENUM ('strict', 'co_requisite', 'recommended');
CREATE TYPE attempt_status AS ENUM ('passed', 'failed', 'currently_enrolled', 'inc', 'dr', 'na');
CREATE TYPE decision_type AS ENUM ('transfer_equivalency', 'discontinued_course_equivalency');
CREATE TYPE school_term_type AS ENUM ('1st Semester', '2nd Semester', 'Summer');

CREATE TABLE faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    CONSTRAINT faculty_name_nonblank CHECK (NULLIF(BTRIM(name), '') IS NOT NULL)
);
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX faculty_name_normalized_key ON faculty (LOWER(BTRIM(name)));

CREATE TABLE department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    CONSTRAINT department_name_nonblank CHECK (NULLIF(BTRIM(name), '') IS NOT NULL)
);
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX department_name_normalized_key ON department (LOWER(BTRIM(name)));
CREATE INDEX department_faculty_idx ON department(faculty_id);

CREATE TABLE profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    role role_type NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    student_number TEXT,
    status profile_status NOT NULL DEFAULT 'invited',
    -- Only advisers store a College assignment. Student organization is derived.
    faculty_id UUID REFERENCES faculty(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profile_name_nonblank CHECK (NULLIF(BTRIM(full_name), '') IS NOT NULL),
    CONSTRAINT profile_email_nonblank CHECK (NULLIF(BTRIM(email), '') IS NOT NULL),
    CONSTRAINT profile_role_fields_valid CHECK (
        (role = 'student' AND NULLIF(BTRIM(student_number), '') IS NOT NULL AND faculty_id IS NULL)
        OR (role = 'adviser' AND student_number IS NULL AND faculty_id IS NOT NULL)
        OR (role = 'admin' AND student_number IS NULL AND faculty_id IS NULL)
    )
);
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX profile_email_normalized_key ON profile (LOWER(BTRIM(email)));
CREATE UNIQUE INDEX profile_student_number_key ON profile(LOWER(BTRIM(student_number)))
    WHERE student_number IS NOT NULL;
CREATE INDEX profile_faculty_role_idx ON profile(faculty_id, role, status);
