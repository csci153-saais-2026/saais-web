-- SAAIS V3 curriculum.

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
ALTER TABLE curriculum_version ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE curriculum_term ENABLE ROW LEVEL SECURITY;
CREATE INDEX curriculum_term_version_idx ON curriculum_term(curriculum_version_id, year_level, term_sequence);

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
ALTER TABLE curriculum_term_course ENABLE ROW LEVEL SECURITY;
CREATE INDEX curriculum_term_course_course_idx ON curriculum_term_course(course_id, curriculum_term_id);
CREATE UNIQUE INDEX curriculum_term_course_fixed_key ON curriculum_term_course(curriculum_term_id, course_id) WHERE NOT is_elective_slot;
CREATE UNIQUE INDEX curriculum_term_course_elective_label_key ON curriculum_term_course(curriculum_term_id, LOWER(BTRIM(slot_label))) WHERE is_elective_slot;
