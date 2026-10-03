-- =============================================================================
-- Student Academic Advising Information System (SAAIS)
-- SAAIS V2 PostgreSQL Database Schema
-- Reviewed & Reconciled against interactive mockup design (mockup/) as Single Source of Truth
-- 20 Application Tables + auth_users Supabase Auth placeholder
-- =============================================================================

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

-- Placeholder for Supabase auth.users
CREATE TABLE auth_users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE
);

-- 1. Faculty (Academic Division / College, e.g., 'College of Computer Studies')
CREATE TABLE faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    CONSTRAINT faculty_name_nonblank CHECK (NULLIF(BTRIM(name), '') IS NOT NULL)
);
CREATE UNIQUE INDEX faculty_name_normalized_key ON faculty (LOWER(BTRIM(name)));

-- 2. Department (Subordinate to Faculty, e.g., 'Department of Computer Science')
CREATE TABLE department (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    CONSTRAINT department_name_nonblank CHECK (NULLIF(BTRIM(name), '') IS NOT NULL)
);
CREATE UNIQUE INDEX department_name_normalized_key ON department (LOWER(BTRIM(name)));

-- 3. Profile (User profile linked to auth_users and affiliated department)
CREATE TABLE profile (
    id UUID PRIMARY KEY REFERENCES auth_users(id) ON DELETE RESTRICT,
    role role_type NOT NULL,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    student_number TEXT,
    status profile_status NOT NULL DEFAULT 'invited',
    department_id UUID REFERENCES department(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profile_name_nonblank CHECK (NULLIF(BTRIM(full_name), '') IS NOT NULL),
    CONSTRAINT profile_email_nonblank CHECK (NULLIF(BTRIM(email), '') IS NOT NULL),
    CONSTRAINT profile_student_number_required CHECK (
        role <> 'student' OR NULLIF(BTRIM(student_number), '') IS NOT NULL
    )
);
CREATE UNIQUE INDEX profile_student_number_key ON profile(student_number)
    WHERE student_number IS NOT NULL;

-- 4. Adviser Assignment (Zero-gap longitudinal advising relationship)
CREATE TABLE adviser_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adviser_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT adviser_assignment_dates_valid CHECK (end_date IS NULL OR end_date > start_date),
    CONSTRAINT adviser_assignment_different_people CHECK (adviser_id <> student_id),
    CONSTRAINT adviser_assignment_reason_nonblank CHECK (NULLIF(BTRIM(reason), '') IS NOT NULL)
);
CREATE UNIQUE INDEX adviser_assignment_one_open_per_student
    ON adviser_assignment(student_id) WHERE end_date IS NULL;

-- 5. Program (Degree program owned by a Faculty)
CREATE TABLE program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    nominal_duration NUMERIC(6,2) NOT NULL,
    status program_status NOT NULL DEFAULT 'active',
    CONSTRAINT program_code_nonblank CHECK (NULLIF(BTRIM(code), '') IS NOT NULL),
    CONSTRAINT program_name_nonblank CHECK (NULLIF(BTRIM(name), '') IS NOT NULL),
    CONSTRAINT program_nominal_duration_positive CHECK (nominal_duration > 0)
);
CREATE UNIQUE INDEX program_code_normalized_key ON program (LOWER(BTRIM(code)));
CREATE UNIQUE INDEX program_name_normalized_key ON program (LOWER(BTRIM(name)));

-- 6. Curriculum Version (Versioned curriculum with delinquency threshold)
CREATE TABLE curriculum_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES program(id) ON DELETE RESTRICT,
    version_label TEXT NOT NULL,
    effective_start DATE NOT NULL,
    effective_end DATE,
    delinquency_threshold NUMERIC(6,2) NOT NULL,
    total_units NUMERIC(7,2) NOT NULL,
    status curriculum_version_status NOT NULL DEFAULT 'draft',
    CONSTRAINT curriculum_version_label_nonblank CHECK (NULLIF(BTRIM(version_label), '') IS NOT NULL),
    CONSTRAINT curriculum_version_dates_valid CHECK (
        effective_end IS NULL OR effective_end >= effective_start
    ),
    CONSTRAINT curriculum_version_threshold_valid CHECK (
        delinquency_threshold > 0 AND MOD(delinquency_threshold * 4, 1) = 0
    ),
    CONSTRAINT curriculum_version_total_units_valid CHECK (
        total_units > 0 AND MOD(total_units * 4, 1) = 0
    ),
    CONSTRAINT curriculum_version_label_per_program_key UNIQUE (program_id, version_label)
);

-- 7. Curriculum Term (Positional year/term slot within curriculum)
CREATE TABLE curriculum_term (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_version_id UUID NOT NULL REFERENCES curriculum_version(id) ON DELETE RESTRICT,
    year_level INTEGER NOT NULL,
    term_sequence INTEGER NOT NULL,
    CONSTRAINT curriculum_term_year_level_valid CHECK (year_level BETWEEN 1 AND 8),
    CONSTRAINT curriculum_term_sequence_valid CHECK (term_sequence BETWEEN 1 AND 3),
    CONSTRAINT curriculum_term_position_key UNIQUE (
        curriculum_version_id, year_level, term_sequence
    )
);

-- 8. Course (Master course catalog entry administered by a Department)
CREATE TABLE course (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES department(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    lecture_hours NUMERIC(6,2) NOT NULL,
    lab_hours NUMERIC(6,2) NOT NULL,
    units NUMERIC(6,2) NOT NULL,
    status course_status NOT NULL DEFAULT 'active',
    repeatable_type repeatable_type NOT NULL DEFAULT 'none',
    CONSTRAINT course_code_nonblank CHECK (NULLIF(BTRIM(code), '') IS NOT NULL),
    CONSTRAINT course_title_nonblank CHECK (NULLIF(BTRIM(title), '') IS NOT NULL),
    CONSTRAINT course_hours_nonnegative CHECK (lecture_hours >= 0 AND lab_hours >= 0),
    CONSTRAINT course_units_quarter_step CHECK (units >= 0.25 AND MOD(units * 4, 1) = 0)
);
CREATE UNIQUE INDEX course_code_normalized_key ON course (LOWER(BTRIM(code)));

-- 9. Prerequisite (Rules governing course prerequisite linkages)
CREATE TABLE prerequisite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE RESTRICT,
    prerequisite_course_id UUID NOT NULL REFERENCES course(id) ON DELETE RESTRICT,
    type prerequisite_type NOT NULL,
    CONSTRAINT prerequisite_not_self CHECK (course_id <> prerequisite_course_id),
    CONSTRAINT prerequisite_pair_key UNIQUE (course_id, prerequisite_course_id)
);

-- 10. Curriculum Term Course (Positional checklist slot: required course or elective slot)
CREATE TABLE curriculum_term_course (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_term_id UUID NOT NULL REFERENCES curriculum_term(id) ON DELETE RESTRICT,
    course_id UUID REFERENCES course(id) ON DELETE RESTRICT,
    is_elective_slot BOOLEAN NOT NULL DEFAULT FALSE,
    slot_label TEXT,
    nominal_units NUMERIC(6,2) NOT NULL,
    CONSTRAINT curriculum_slot_shape_valid CHECK (
        (is_elective_slot AND course_id IS NULL AND NULLIF(BTRIM(slot_label), '') IS NOT NULL)
        OR (NOT is_elective_slot AND course_id IS NOT NULL AND slot_label IS NULL)
    ),
    CONSTRAINT curriculum_slot_units_valid CHECK (
        nominal_units >= 0.25 AND MOD(nominal_units * 4, 1) = 0
    )
);

-- 11. Student Curriculum Assignment (Student degree catalog binding history)
CREATE TABLE student_curriculum_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    curriculum_version_id UUID NOT NULL REFERENCES curriculum_version(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT NOT NULL,
    CONSTRAINT student_curriculum_dates_valid CHECK (end_date IS NULL OR end_date > start_date),
    CONSTRAINT student_curriculum_reason_nonblank CHECK (NULLIF(BTRIM(reason), '') IS NOT NULL)
);
CREATE UNIQUE INDEX student_curriculum_one_open_per_student
    ON student_curriculum_assignment(student_id) WHERE end_date IS NULL;

-- 12. School Term (Calendar academic term with lock state and override)
CREATE TABLE school_term (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    term_type school_term_type NOT NULL,
    school_year TEXT GENERATED ALWAYS AS (
        CASE WHEN term_type = 'Summer'::school_term_type
            THEN (end_year - 1)::TEXT || ' - ' || end_year::TEXT
            ELSE start_year::TEXT || ' - ' || end_year::TEXT END
    ) STORED,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    override_flag BOOLEAN NOT NULL DEFAULT FALSE,
    override_actor_id UUID REFERENCES profile(id) ON DELETE RESTRICT,
    override_at TIMESTAMPTZ,
    CONSTRAINT school_term_year_range_valid CHECK (
        start_year BETWEEN 1900 AND 3000 AND end_year BETWEEN 1900 AND 3000
    ),
    CONSTRAINT school_term_year_order_valid CHECK (
        (term_type IN ('1st Semester', '2nd Semester') AND end_year > start_year)
        OR (term_type = 'Summer' AND end_year >= start_year)
    ),
    CONSTRAINT school_term_override_valid CHECK (
        NOT override_flag OR (override_actor_id IS NOT NULL AND override_at IS NOT NULL)
    ),
    CONSTRAINT school_term_natural_key UNIQUE (school_year, term_type)
);

-- 13. Course Offering (Term offering instance; supports by_request accommodation)
CREATE TABLE course_offering (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_term_id UUID NOT NULL REFERENCES school_term(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE RESTRICT,
    is_by_request BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT course_offering_term_course_key UNIQUE (school_term_id, course_id)
);

-- 14. Attempt (Student enrollment attempt in an offering; soft prerequisite override)
CREATE TABLE attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    course_offering_id UUID NOT NULL REFERENCES course_offering(id) ON DELETE RESTRICT,
    curriculum_term_course_id UUID REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    status attempt_status NOT NULL DEFAULT 'currently_enrolled',
    midterm_grade NUMERIC(4,2),
    final_grade NUMERIC(4,2),
    inc_deadline DATE,
    prerequisite_override BOOLEAN NOT NULL DEFAULT FALSE,
    prerequisite_override_reason TEXT,
    units_attempted NUMERIC(6,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attempt_student_offering_key UNIQUE (student_id, course_offering_id),
    CONSTRAINT attempt_midterm_grade_valid CHECK (
        midterm_grade IS NULL OR
        (midterm_grade BETWEEN 1 AND 5 AND MOD(midterm_grade * 4, 1) = 0)
    ),
    CONSTRAINT attempt_final_grade_valid CHECK (
        final_grade IS NULL OR
        (final_grade BETWEEN 1 AND 5 AND MOD(final_grade * 4, 1) = 0)
    ),
    CONSTRAINT attempt_units_valid CHECK (
        units_attempted >= 0.25 AND MOD(units_attempted * 4, 1) = 0
    ),
    CONSTRAINT attempt_override_reason_valid CHECK (
        (prerequisite_override AND NULLIF(BTRIM(prerequisite_override_reason), '') IS NOT NULL)
        OR (NOT prerequisite_override AND prerequisite_override_reason IS NULL)
    ),
    CONSTRAINT attempt_status_grade_valid CHECK (
        (status = 'passed' AND final_grade IS NOT NULL AND final_grade <= 3)
        OR (status = 'failed' AND final_grade IS NOT NULL AND final_grade > 3)
        OR (status IN ('currently_enrolled', 'inc', 'dr', 'na') AND final_grade IS NULL)
    ),
    CONSTRAINT attempt_inc_deadline_valid CHECK (
        (status = 'inc' AND inc_deadline IS NOT NULL)
        OR (status <> 'inc' AND inc_deadline IS NULL)
    )
);

-- 15. Elective Mapping (Enrolled course mapped to an open elective checklist slot)
CREATE TABLE elective_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES attempt(id) ON DELETE RESTRICT,
    curriculum_term_course_id UUID NOT NULL REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    mapped_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    units_credited NUMERIC(6,2) NOT NULL,
    justification TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT elective_mapping_units_valid CHECK (
        units_credited >= 0.25 AND MOD(units_credited * 4, 1) = 0
    ),
    CONSTRAINT elective_mapping_justification_nonblank CHECK (
        NULLIF(BTRIM(justification), '') IS NOT NULL
    )
);

-- 16. Equivalency Decision (One-to-one transfer or discontinued course substitution)
CREATE TABLE equivalency_decision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES attempt(id) ON DELETE RESTRICT,
    destination_curriculum_term_course_id UUID NOT NULL REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    decision_type decision_type NOT NULL,
    decided_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    units_credited NUMERIC(6,2) NOT NULL,
    justification TEXT NOT NULL,
    CONSTRAINT equivalency_units_valid CHECK (
        units_credited >= 0.25 AND MOD(units_credited * 4, 1) = 0
    ),
    CONSTRAINT equivalency_justification_nonblank CHECK (
        NULLIF(BTRIM(justification), '') IS NOT NULL
    )
);

-- 17. INC Resolution (Resolution of incomplete grade before compliance deadline)
CREATE TABLE inc_resolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES attempt(id) ON DELETE RESTRICT,
    completion_grade NUMERIC(4,2) NOT NULL,
    resolved_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL,
    CONSTRAINT inc_resolution_grade_valid CHECK (
        completion_grade BETWEEN 1 AND 5 AND MOD(completion_grade * 4, 1) = 0
    ),
    CONSTRAINT inc_resolution_reason_nonblank CHECK (NULLIF(BTRIM(reason), '') IS NOT NULL)
);

-- 18. Advising Note (Staff-only, append-only dated notes per student)
CREATE TABLE advising_note (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    authored_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    body_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT advising_note_body_nonblank CHECK (NULLIF(BTRIM(body_text), '') IS NOT NULL)
);

-- 19. Attempt Remark (Staff-only remark targeted to an attempt or empty checklist slot)
CREATE TABLE attempt_remark (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    attempt_id UUID REFERENCES attempt(id) ON DELETE RESTRICT,
    curriculum_term_course_id UUID REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    authored_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    body_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attempt_remark_exactly_one_target CHECK (
        (attempt_id IS NOT NULL AND curriculum_term_course_id IS NULL)
        OR (attempt_id IS NULL AND curriculum_term_course_id IS NOT NULL)
    ),
    CONSTRAINT attempt_remark_body_nonblank CHECK (NULLIF(BTRIM(body_text), '') IS NOT NULL)
);

-- 20. Audit Log Entry (Immutable, append-only system audit trail)
CREATE TABLE audit_log_entry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profile(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_action_nonblank CHECK (NULLIF(BTRIM(action), '') IS NOT NULL),
    CONSTRAINT audit_entity_type_nonblank CHECK (NULLIF(BTRIM(entity_type), '') IS NOT NULL)
);

-- RLS, triggers, calculations, and audit workflows are intentionally omitted.
