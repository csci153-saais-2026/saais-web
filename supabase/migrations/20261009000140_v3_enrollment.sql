-- SAAIS V3 enrollment.

CREATE TABLE course_offering (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_term_id UUID NOT NULL REFERENCES school_term(id) ON DELETE RESTRICT,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE RESTRICT,
    is_by_request BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT course_offering_id_term_key UNIQUE (id, school_term_id),
    CONSTRAINT course_offering_term_course_key UNIQUE (school_term_id, course_id)
);
ALTER TABLE course_offering ENABLE ROW LEVEL SECURITY;
CREATE INDEX course_offering_course_idx ON course_offering(course_id, school_term_id);

CREATE TABLE attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    course_offering_id UUID NOT NULL REFERENCES course_offering(id) ON DELETE RESTRICT,
    curriculum_term_course_id UUID REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    status attempt_status NOT NULL DEFAULT 'currently_enrolled',
    midterm_grade NUMERIC,
    final_grade NUMERIC,
    inc_deadline DATE,
    -- Snapshot actual course units at recording time; never manually reduced.
    units_attempted NUMERIC(6,2) NOT NULL,
    created_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    updated_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    CONSTRAINT attempt_student_key UNIQUE (id, student_id),
    CONSTRAINT attempt_student_units_key UNIQUE (id, student_id, units_attempted),
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
ALTER TABLE attempt ENABLE ROW LEVEL SECURITY;
CREATE INDEX attempt_student_idx ON attempt(student_id, course_offering_id);
CREATE INDEX attempt_offering_idx ON attempt(course_offering_id);
CREATE INDEX attempt_slot_idx ON attempt(curriculum_term_course_id, student_id);
CREATE INDEX attempt_inc_deadline_idx ON attempt(inc_deadline, student_id) WHERE status = 'inc';

CREATE TABLE inc_resolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    attempt_id UUID NOT NULL UNIQUE,
    CONSTRAINT inc_resolution_student_attempt_key FOREIGN KEY (attempt_id, student_id)
        REFERENCES attempt(id, student_id) ON DELETE RESTRICT,
    completion_grade NUMERIC NOT NULL,
    resolved_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    effective_status attempt_status GENERATED ALWAYS AS (
        CASE WHEN completion_grade <= 3 THEN 'passed'::attempt_status ELSE 'failed'::attempt_status END
    ) STORED,
    CONSTRAINT inc_resolution_grade_valid CHECK (
        completion_grade BETWEEN 1 AND 5 AND MOD(completion_grade * 4, 1) = 0
    ),
    CONSTRAINT inc_resolution_reason_nonblank CHECK (NULLIF(BTRIM(reason), '') IS NOT NULL)
);
ALTER TABLE inc_resolution ENABLE ROW LEVEL SECURITY;
