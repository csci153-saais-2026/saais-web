-- SAAIS V3 catalog.

CREATE TABLE program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES department(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    nominal_duration NUMERIC(6,2) NOT NULL,
    status program_status NOT NULL DEFAULT 'active',
    CONSTRAINT program_code_nonblank CHECK (NULLIF(BTRIM(code), '') IS NOT NULL),
    CONSTRAINT program_name_nonblank CHECK (NULLIF(BTRIM(name), '') IS NOT NULL),
    CONSTRAINT program_nominal_duration_positive CHECK (nominal_duration > 0)
);
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX program_code_normalized_key ON program (LOWER(BTRIM(code)));
CREATE UNIQUE INDEX program_name_normalized_key ON program (LOWER(BTRIM(name)));
CREATE INDEX program_department_idx ON program(department_id);

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
ALTER TABLE course ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX course_code_normalized_key ON course (LOWER(BTRIM(code)));
CREATE INDEX course_department_idx ON course(department_id, status);

CREATE TABLE prerequisite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE RESTRICT,
    prerequisite_course_id UUID NOT NULL REFERENCES course(id) ON DELETE RESTRICT,
    type prerequisite_type NOT NULL,
    CONSTRAINT prerequisite_not_self CHECK (course_id <> prerequisite_course_id),
    CONSTRAINT prerequisite_pair_key UNIQUE (course_id, prerequisite_course_id)
);
ALTER TABLE prerequisite ENABLE ROW LEVEL SECURITY;
CREATE INDEX prerequisite_source_idx ON prerequisite(prerequisite_course_id);
