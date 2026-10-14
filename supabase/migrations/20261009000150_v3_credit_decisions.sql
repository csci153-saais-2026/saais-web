-- SAAIS V3 credit decisions.

CREATE TABLE elective_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    attempt_id UUID NOT NULL,
    curriculum_term_course_id UUID NOT NULL REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    mapped_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    units_credited NUMERIC(6,2) NOT NULL,
    justification TEXT NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profile(id) ON DELETE RESTRICT,
    revocation_reason TEXT,
    CONSTRAINT elective_mapping_source_key FOREIGN KEY (attempt_id, student_id, units_credited)
        REFERENCES attempt(id, student_id, units_attempted) ON DELETE RESTRICT,
    CONSTRAINT elective_mapping_revocation_valid CHECK (
        (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
        OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL
            AND NULLIF(BTRIM(revocation_reason), '') IS NOT NULL)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT elective_mapping_units_valid CHECK (
        units_credited >= 0.25 AND MOD(units_credited * 4, 1) = 0
    ),
    CONSTRAINT elective_mapping_justification_nonblank CHECK (
        NULLIF(BTRIM(justification), '') IS NOT NULL
    )
);
ALTER TABLE elective_mapping ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX elective_mapping_live_source_key ON elective_mapping(attempt_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX elective_mapping_live_destination_key ON elective_mapping(student_id, curriculum_term_course_id) WHERE revoked_at IS NULL;

CREATE TABLE equivalency_decision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    attempt_id UUID NOT NULL,
    destination_curriculum_term_course_id UUID NOT NULL REFERENCES curriculum_term_course(id) ON DELETE RESTRICT,
    decision_type decision_type NOT NULL,
    decided_by UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    units_credited NUMERIC(6,2) NOT NULL,
    justification TEXT NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES profile(id) ON DELETE RESTRICT,
    revocation_reason TEXT,
    CONSTRAINT equivalency_decision_source_key FOREIGN KEY (attempt_id, student_id, units_credited)
        REFERENCES attempt(id, student_id, units_attempted) ON DELETE RESTRICT,
    CONSTRAINT equivalency_decision_revocation_valid CHECK (
        (revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL)
        OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL
            AND NULLIF(BTRIM(revocation_reason), '') IS NOT NULL)
    ),
    CONSTRAINT equivalency_units_valid CHECK (
        units_credited >= 0.25 AND MOD(units_credited * 4, 1) = 0
    ),
    CONSTRAINT equivalency_justification_nonblank CHECK (
        NULLIF(BTRIM(justification), '') IS NOT NULL
    )
);
ALTER TABLE equivalency_decision ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX equivalency_decision_live_source_key ON equivalency_decision(attempt_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX equivalency_decision_live_destination_key ON equivalency_decision(student_id, destination_curriculum_term_course_id) WHERE revoked_at IS NULL;

CREATE TABLE attempt_remark (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profile(id) ON DELETE RESTRICT,
    attempt_id UUID,
    CONSTRAINT attempt_remark_student_attempt_key FOREIGN KEY (attempt_id, student_id)
        REFERENCES attempt(id, student_id) ON DELETE RESTRICT,
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
ALTER TABLE attempt_remark ENABLE ROW LEVEL SECURITY;
CREATE INDEX attempt_remark_recent_idx ON attempt_remark(student_id, created_at DESC, id);
CREATE INDEX attempt_remark_attempt_idx ON attempt_remark(attempt_id);
CREATE INDEX attempt_remark_slot_idx ON attempt_remark(curriculum_term_course_id);
