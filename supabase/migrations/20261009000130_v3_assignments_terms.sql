-- SAAIS V3 assignments terms.

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
ALTER TABLE adviser_assignment ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX adviser_assignment_one_open_per_student
    ON adviser_assignment(student_id) WHERE end_date IS NULL;
CREATE INDEX adviser_assignment_adviser_idx ON adviser_assignment(adviser_id, student_id, end_date);

CREATE TABLE student_curriculum_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    curriculum_version_id UUID NOT NULL REFERENCES curriculum_version(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT student_curriculum_assignment_student_key UNIQUE (id, student_id),
    CONSTRAINT student_curriculum_dates_valid CHECK (end_date IS NULL OR end_date > start_date),
    CONSTRAINT student_curriculum_reason_nonblank CHECK (NULLIF(BTRIM(reason), '') IS NOT NULL)
);
ALTER TABLE student_curriculum_assignment ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX student_curriculum_one_open_per_student
    ON student_curriculum_assignment(student_id) WHERE end_date IS NULL;
CREATE INDEX student_curriculum_assignment_curriculum_idx ON student_curriculum_assignment(curriculum_version_id, student_id);

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
    ends_on DATE NOT NULL,
    default_inc_deadline DATE GENERATED ALWAYS AS ((ends_on + INTERVAL '1 year')::DATE) STORED,
    chronological_key INTEGER GENERATED ALWAYS AS (
        (CASE WHEN term_type = 'Summer' THEN end_year - 1 ELSE start_year END) * 10
        + CASE term_type WHEN '1st Semester' THEN 1 WHEN '2nd Semester' THEN 2 ELSE 3 END
    ) STORED,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    override_flag BOOLEAN NOT NULL DEFAULT FALSE,
    override_actor_id UUID REFERENCES profile(id) ON DELETE RESTRICT,
    override_at TIMESTAMPTZ,
    CONSTRAINT school_term_end_date_valid CHECK (EXTRACT(YEAR FROM ends_on) BETWEEN start_year AND end_year),
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
ALTER TABLE school_term ENABLE ROW LEVEL SECURITY;
