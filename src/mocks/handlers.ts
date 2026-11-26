import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@/lib/api/types";
import {
  canAccessDepartment,
  canAccessFaculty,
  hasMockRole,
  MOCK_IDS,
  MOCK_PERSONAS,
  resolveMockPersonaFromAuthHeader,
  type MockPersona,
  type SaaisRole,
} from "./personas";
import { getMockDatabase } from "./store";

let syntheticUuidCounter = 100;

// The contract allows object-valued audit snapshots; the generator infers an
// empty record for an object schema with unspecified properties.
function auditSnapshot(
  value: Record<string, unknown>,
): ApiSchema<"AuditLogEntry">["old_value"] {
  return value as ApiSchema<"AuditLogEntry">["old_value"];
}

function alreadyPassedCourse(
  studentId: string,
  offeringId: string,
  existingAttemptId?: string,
): boolean {
  const db = getMockDatabase();
  const courseId = db.courseOfferings.find(
    (o) => o.id === offeringId,
  )?.course_id;
  return Boolean(
    courseId &&
    db.attemptResults.some(
      (a) =>
        a.student_id === studentId &&
        a.id !== existingAttemptId &&
        a.effective_status === "passed" &&
        db.courseOfferings.some(
          (o) => o.id === a.course_offering_id && o.course_id === courseId,
        ),
    ),
  );
}

function isRequiredCourseInDepartment(
  courseId: string,
  departmentId: string,
): boolean {
  const db = getMockDatabase();
  const departmentTermIds = new Set(
    db.curriculumTerms
      .filter((term) => {
        const version = db.curriculumVersions.find(
          (item) => item.id === term.curriculum_version_id,
        );
        const program = db.programs.find(
          (item) => item.id === version?.program_id,
        );
        return program?.department_id === departmentId;
      })
      .map((term) => term.id),
  );

  return db.curriculumTermCourses.some(
    (slot) =>
      slot.course_id === courseId &&
      departmentTermIds.has(slot.curriculum_term_id) &&
      !slot.is_elective_slot &&
      slot.slot_type !== "elective",
  );
}

function courseOfferingHasHistory(offeringId: string): boolean {
  const db = getMockDatabase();
  return (
    db.attempts.some((attempt) => attempt.course_offering_id === offeringId) ||
    db.attemptResults.some(
      (result) => result.course_offering_id === offeringId,
    ) ||
    db.advisingPlanItems.some((item) => item.course_offering_id === offeringId)
  );
}

function compareAttemptChronology(
  left: ApiSchema<"AttemptResult">,
  right: ApiSchema<"AttemptResult">,
): number {
  const db = getMockDatabase();
  const termOrder = (attempt: ApiSchema<"AttemptResult">) => {
    const offering = db.courseOfferings.find(
      (item) => item.id === attempt.course_offering_id,
    );
    return (
      db.schoolTerms.find((term) => term.id === offering?.school_term_id)
        ?.chronological_key ?? 0
    );
  };
  return (
    termOrder(left) - termOrder(right) ||
    (left.created_at ?? "").localeCompare(right.created_at ?? "") ||
    left.id.localeCompare(right.id)
  );
}

function markRetakeResults(
  attempts: ApiSchema<"AttemptResult">[],
): ApiSchema<"AttemptResult">[] {
  const db = getMockDatabase();
  const courseId = (attempt: ApiSchema<"AttemptResult">) =>
    db.courseOfferings.find((o) => o.id === attempt.course_offering_id)
      ?.course_id;
  const numericGrade = (attempt: ApiSchema<"AttemptResult">) =>
    attempt.completion_grade ?? attempt.final_grade;
  const overrides = new Map(attempts.map((attempt) => [attempt.id, attempt]));
  const all = db.attemptResults.map(
    (attempt) => overrides.get(attempt.id) ?? attempt,
  );
  for (const attempt of attempts)
    if (!all.some((existing) => existing.id === attempt.id)) all.push(attempt);
  return attempts.map((attempt) => {
    const course = courseId(attempt);
    const same = all
      .filter(
        (other) =>
          other.student_id === attempt.student_id &&
          course &&
          courseId(other) === course,
      )
      .sort(compareAttemptChronology);
    const numeric = same.filter((other) => numericGrade(other) != null);
    const selected =
      numeric.at(-1) ?? same.find((other) => other.is_lapsed_inc);
    const grade = numericGrade(attempt) ?? (attempt.is_lapsed_inc ? 5 : null);
    const repeated =
      grade != null &&
      grade > 3 &&
      !!selected &&
      selected.id !== attempt.id &&
      same.indexOf(selected) > same.indexOf(attempt);
    return {
      ...attempt,
      is_repeated: repeated,
      counts_toward_cumulative_gwa: selected?.id === attempt.id,
    };
  });
}

function studentMetrics(studentId: string, departmentId: string) {
  const db = getMockDatabase();
  const results = markRetakeResults(
    db.attemptResults.filter((a) => a.student_id === studentId),
  );
  const counted = results
    .filter((a) => a.counts_toward_cumulative_gwa)
    .map((a) => ({
      grade:
        a.completion_grade ?? a.final_grade ?? (a.is_lapsed_inc ? 5 : null),
      units: a.units_attempted,
    }))
    .filter((a) => a.grade != null && a.units > 0);
  const countedUnits = counted.reduce((sum, row) => sum + row.units, 0);
  const gwa = countedUnits
    ? Number(
        (
          counted.reduce((sum, row) => sum + row.grade! * row.units, 0) /
          countedUnits
        ).toFixed(2),
      )
    : null;
  const outsideCreditUnits = db.outsideCredits
    .filter(
      (credit) => credit.student_id === studentId && credit.revoked_at == null,
    )
    .reduce((sum, credit) => sum + credit.units_credited, 0);
  const earnedUnits =
    results
      .filter(
        (a) =>
          a.effective_status === "passed" && a.counts_toward_cumulative_gwa,
      )
      .reduce((sum, row) => sum + row.units_attempted, 0) + outsideCreditUnits;
  const openInc = results.filter(
    (a) =>
      a.recorded_status === "inc" &&
      a.completion_grade == null &&
      !a.is_lapsed_inc,
  );
  const lapsed = results.filter((a) => a.is_lapsed_inc);
  const flags = db.gradeFlags.filter(
    (flag) => flag.student_id === studentId && flag.status === "open",
  );
  const deficiencies = results.filter(
    (a) =>
      !a.is_repeated &&
      (a.effective_status === "failed" ||
        a.effective_status === "dr" ||
        (a.recorded_status === "inc" && a.completion_grade == null)),
  );
  const failed = counted.filter((row) => row.grade! > 3);
  const failedUnits = failed.reduce((sum, row) => sum + row.units, 0);
  const settings = db.systemSettings.find(
    (setting) => setting.department_id === departmentId,
  );
  const failurePct = countedUnits ? (failedUnits * 100) / countedUnits : 0;
  const standing: ApiSchema<"AcademicStanding"> =
    settings && failurePct >= settings.dismissal_pct
      ? "dismissed"
      : settings && failurePct >= settings.probation_pct
        ? "probation"
        : settings && failurePct >= settings.warning_pct
          ? "warning"
          : "good_standing";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const isDelinquent = db.schoolTerms.some((term) => {
    const assignment = db.studentCurriculumAssignments
      .filter(
        (a) =>
          a.student_id === studentId &&
          a.start_date <= term.ends_on &&
          (!a.end_date || a.end_date >= term.ends_on),
      )
      .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
    const curriculum = db.curriculumVersions.find(
      (c) => c.id === assignment?.curriculum_version_id,
    );
    if (!curriculum) return false;
    const failedInTerm = results
      .filter((a) =>
        db.courseOfferings.some(
          (o) => o.id === a.course_offering_id && o.school_term_id === term.id,
        ),
      )
      .filter(
        (a) =>
          (a.completion_grade ??
            a.final_grade ??
            (a.recorded_status === "inc" &&
            a.inc_deadline &&
            a.inc_deadline < today
              ? 5
              : null) ??
            0) > 3,
      )
      .reduce((sum, a) => sum + a.units_attempted, 0);
    return failedInTerm >= curriculum.delinquency_threshold;
  });
  return {
    results,
    counted,
    countedUnits,
    outsideCreditUnits,
    gwa,
    earnedUnits,
    openInc,
    lapsed,
    flags,
    deficiencies,
    failed,
    failedUnits,
    failurePct,
    standing,
    isDelinquent,
  };
}

function deficiencyCount(deficiencies: ApiSchema<"AttemptResult">[]): number {
  return new Set(deficiencies.map((attempt) => attempt.id)).size;
}

function studentDeficiencies(
  metrics: ReturnType<typeof studentMetrics>,
): ApiSchema<"StudentDeficiencyItem">[] {
  const db = getMockDatabase();
  return [
    ...metrics.openInc.map((attempt) => {
      const offering = db.courseOfferings.find(
        (item) => item.id === attempt.course_offering_id,
      );
      const course = db.courses.find((item) => item.id === offering?.course_id);
      const schoolTerm = db.schoolTerms.find(
        (item) => item.id === offering?.school_term_id,
      );
      return {
        kind: "open_inc" as const,
        attempt_id: attempt.id,
        course_code: course?.code ?? "Unknown",
        course_title: course?.title ?? "Course unavailable",
        term_label: schoolTerm
          ? `${schoolTerm.term_type} ${schoolTerm.school_year}`
          : null,
        inc_deadline: attempt.inc_deadline,
        detail: null,
      };
    }),
    ...metrics.lapsed.map((attempt) => {
      const offering = db.courseOfferings.find(
        (item) => item.id === attempt.course_offering_id,
      );
      const course = db.courses.find((item) => item.id === offering?.course_id);
      return {
        kind: "lapsed_inc" as const,
        attempt_id: attempt.id,
        course_code: course?.code ?? "Unknown",
        course_title: course?.title ?? "Course unavailable",
        inc_deadline: attempt.inc_deadline,
      };
    }),
    ...metrics.results
      .filter(
        (attempt) =>
          attempt.effective_status === "failed" &&
          attempt.counts_toward_cumulative_gwa,
      )
      .map((attempt) => {
        const offering = db.courseOfferings.find(
          (item) => item.id === attempt.course_offering_id,
        );
        const course = db.courses.find(
          (item) => item.id === offering?.course_id,
        );
        return {
          kind: "failed" as const,
          attempt_id: attempt.id,
          course_code: course?.code ?? "Unknown",
          course_title: course?.title ?? "Course unavailable",
        };
      }),
  ];
}

function deficiencySummary(
  studentId: string,
  includeWithoutDeficiencies = false,
): ApiSchema<"DeficiencyStudentSummary"> | null {
  const db = getMockDatabase();
  const org = db.studentOrganizations.find(
    (item) => item.student_id === studentId,
  );
  const profile = db.profiles.find((item) => item.id === studentId);
  const program = db.programs.find((item) => item.id === org?.program_id);
  const curriculum = db.curriculumVersions.find(
    (item) => item.id === org?.curriculum_version_id,
  );
  if (!org || !profile || !program || !curriculum) return null;
  const metrics = studentMetrics(studentId, org.department_id);
  const deficiencies = studentDeficiencies(metrics);
  if (!deficiencies.length && !includeWithoutDeficiencies) return null;
  const adviser = db.adviserAssignments.find(
    (item) => item.student_id === studentId && item.end_date === null,
  );
  return {
    student_id: studentId,
    student_number: profile.student_number ?? "",
    full_name: profile.full_name,
    program_code: program.code,
    curriculum_label: curriculum.version_label,
    year_level:
      metrics.earnedUnits >= 110
        ? 4
        : metrics.earnedUnits >= 72
          ? 3
          : metrics.earnedUnits >= 36
            ? 2
            : 1,
    adviser_id: adviser?.adviser_id ?? null,
    adviser_name: adviser?.adviser_name ?? null,
    gwa: metrics.gwa,
    standing: metrics.standing,
    failed_units: metrics.failedUnits,
    open_inc_count: metrics.openInc.length,
    lapsed_inc_count: metrics.lapsed.length,
    open_flags_count: metrics.flags.length,
    deficiencies,
  };
}

const departmentInviteRoles = new Set([
  "student",
  "adviser",
  "department_staff",
  "department_head",
]);
const resendableInvitationStates = new Set([
  "pending",
  "expired",
  "revoked",
  "declined",
]);

const roleTypes = new Set([
  "student",
  "adviser",
  "department_head",
  "department_staff",
  "dean",
  "admin",
]);

function isRoleAssignmentInput(
  value: unknown,
): value is ApiSchema<"RoleAssignmentInput"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const assignment = value as Record<string, unknown>;
  if (
    Object.keys(assignment).some(
      (key) => !["role", "faculty_id", "department_id"].includes(key),
    ) ||
    typeof assignment.role !== "string" ||
    !roleTypes.has(assignment.role)
  ) {
    return false;
  }
  const validId = (id: unknown) =>
    id === undefined ||
    id === null ||
    (typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ));
  return validId(assignment.faculty_id) && validId(assignment.department_id);
}

function isRoleAssignmentList(
  value: unknown,
): value is ApiSchema<"RoleAssignmentInput">[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= 6 &&
    value.every(isRoleAssignmentInput)
  );
}

function canManageDepartmentInvite(
  persona: MockPersona,
  profile: ApiSchema<"Profile">,
): boolean {
  if (persona.roles.includes("admin")) return true;
  const roles = profile.roles?.length ? profile.roles : [profile.role];
  return (
    profile.id !== persona.profileId &&
    !!persona.departmentId &&
    profile.department_id === persona.departmentId &&
    roles.every((role) => departmentInviteRoles.has(role))
  );
}

function departmentEncodingClosed(studentId: string, termId: string): boolean {
  const db = getMockDatabase();
  const departmentId = db.studentOrganizations.find(
    (org) => org.student_id === studentId,
  )?.department_id;
  return (
    !!departmentId &&
    db.departmentTermEncodings.some(
      (c) =>
        c.department_id === departmentId &&
        c.school_term_id === termId &&
        c.is_closed,
    )
  );
}

function attemptEncodingClosed(studentId: string, attemptId: string): boolean {
  const db = getMockDatabase();
  const attempt = db.attemptResults.find(
    (a) => a.id === attemptId && a.student_id === studentId,
  );
  const termId = db.courseOfferings.find(
    (o) => o.id === attempt?.course_offering_id,
  )?.school_term_id;
  return !!termId && departmentEncodingClosed(studentId, termId);
}

function encodingClosedResponse() {
  return errorJson(
    409,
    "TERM_LOCKED",
    "Grade encoding is closed for this department and term.",
  );
}

function nextSyntheticUuid(): string {
  syntheticUuidCounter += 1;
  const hex = syntheticUuidCounter.toString(16).padStart(12, "0");
  return `99999999-0000-4000-8000-${hex}`;
}

function isIncCompletionCorrectionRequest(
  value: unknown,
): value is ApiSchema<"INCCompletionCorrectionRequest"> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const body = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "completion_grade",
    "reason",
    "expected_updated_at",
  ]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) return false;

  const grade = body.completion_grade;
  const reason = body.reason;
  const expectedUpdatedAt = body.expected_updated_at;
  return (
    typeof grade === "number" &&
    Number.isFinite(grade) &&
    grade >= 1 &&
    grade <= 5 &&
    (grade * 4) % 1 === 0 &&
    typeof reason === "string" &&
    reason.trim().length > 0 &&
    reason.length <= 4000 &&
    Array.from(reason).length <= 2000 &&
    typeof expectedUpdatedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      expectedUpdatedAt,
    ) &&
    Number.isFinite(Date.parse(expectedUpdatedAt))
  );
}

function isAdvisingAIRequest(
  value: unknown,
): value is ApiSchema<"AdvisingAIRequest"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (
    Object.keys(request).some((key) => key !== "message" && key !== "history")
  )
    return false;
  const validText = (text: unknown) =>
    typeof text === "string" &&
    text.trim().length > 0 &&
    Array.from(text).length <= 4000;
  if (!validText(request.message)) return false;
  if (request.history === undefined) return true;
  if (!Array.isArray(request.history) || request.history.length > 20)
    return false;
  return request.history.every((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const message = item as Record<string, unknown>;
    return (
      Object.keys(message).every(
        (key) => key === "role" || key === "content",
      ) &&
      (message.role === "user" || message.role === "assistant") &&
      validText(message.content)
    );
  });
}

function errorJson(
  status: number,
  code: string,
  message: string,
  details: string | null = null,
  hint: string | null = null,
) {
  const payload: ApiSchema<"Error"> = {
    code,
    message,
    details,
    hint,
  };
  return HttpResponse.json(payload, { status });
}

function requireApiKey(request: Request): Response | null {
  const apiKey = request.headers.get("apikey")?.trim();
  if (!apiKey) {
    return errorJson(
      401,
      "MISSING_API_KEY",
      "Supabase publishable API key (apikey header) is required.",
      null,
      "Include the apikey header on every request.",
    );
  }
  return null;
}

function authenticateRequest(
  request: Request,
  allowedRoles?: readonly SaaisRole[],
): { persona: MockPersona } | { response: Response } {
  const missingKey = requireApiKey(request);
  if (missingKey) {
    return { response: missingKey };
  }

  const persona = resolveMockPersonaFromAuthHeader(
    request.headers.get("Authorization"),
  );
  if (!persona) {
    return {
      response: errorJson(
        401,
        "PGRST301",
        "Valid user Bearer access token is required.",
        null,
        "Provide Authorization: Bearer <access_token>.",
      ),
    };
  }

  if (allowedRoles && !hasMockRole(persona, allowedRoles)) {
    return {
      response: errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        `Role '${persona.primaryRole}' is not authorized for this operation.`,
        `Allowed roles: ${allowedRoles.join(", ")}`,
        null,
      ),
    };
  }

  return { persona };
}

function matchesLike(
  value: string,
  pattern: string,
  insensitive: boolean,
): boolean {
  const input = Array.from(insensitive ? value.toLowerCase() : value);
  const tokens = Array.from(insensitive ? pattern.toLowerCase() : pattern);
  let previous = Array(input.length + 1).fill(false) as boolean[];
  previous[0] = true;
  for (const token of tokens) {
    const next = Array(input.length + 1).fill(false) as boolean[];
    if (token === "*" || token === "%") {
      next[0] = previous[0]!;
      for (let i = 1; i <= input.length; i++)
        next[i] = previous[i]! || next[i - 1]!;
    } else {
      for (let i = 1; i <= input.length; i++)
        next[i] = previous[i - 1]! && (token === "_" || token === input[i - 1]);
    }
    previous = next;
  }
  return previous[input.length]!;
}

function comparePostgrestValues(value: unknown, target: string): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const number = Number(target);
    return Number.isFinite(number) ? value - number : null;
  }
  const text = String(value);
  if (
    /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text) &&
    /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(target)
  ) {
    const left = Date.parse(text),
      right = Date.parse(target);
    return Number.isFinite(left) && Number.isFinite(right)
      ? left - right
      : null;
  }
  return text < target ? -1 : text > target ? 1 : 0;
}

function matchesPostgrestOperator(
  fieldValue: unknown,
  filterExpr: string,
): boolean {
  if (filterExpr === "is.null") {
    return fieldValue === null || fieldValue === undefined;
  }
  if (filterExpr === "not.is.null") {
    return fieldValue !== null && fieldValue !== undefined;
  }
  if (fieldValue == null) return false;
  if (filterExpr.startsWith("eq.")) {
    const target = filterExpr.slice(3);
    return String(fieldValue) === target;
  }
  if (filterExpr.startsWith("neq.")) {
    const target = filterExpr.slice(4);
    return String(fieldValue) !== target;
  }
  if (filterExpr.startsWith("in.(") && filterExpr.endsWith(")")) {
    const items = filterExpr
      .slice(4, -1)
      .split(",")
      .map((s) => s.trim());
    return items.includes(String(fieldValue));
  }
  if (filterExpr.startsWith("ilike.")) {
    return matchesLike(String(fieldValue), filterExpr.slice(6), true);
  }
  if (filterExpr.startsWith("like.")) {
    return matchesLike(String(fieldValue), filterExpr.slice(5), false);
  }
  if (filterExpr.startsWith("gte.")) {
    return (comparePostgrestValues(fieldValue, filterExpr.slice(4)) ?? -1) >= 0;
  }
  if (filterExpr.startsWith("lte.")) {
    return (comparePostgrestValues(fieldValue, filterExpr.slice(4)) ?? 1) <= 0;
  }
  if (filterExpr.startsWith("gt.")) {
    return (comparePostgrestValues(fieldValue, filterExpr.slice(3)) ?? -1) > 0;
  }
  if (filterExpr.startsWith("lt.")) {
    return (comparePostgrestValues(fieldValue, filterExpr.slice(3)) ?? 1) < 0;
  }
  return true;
}

function matchesPostgrestDisjunction<T extends object>(
  row: T,
  filterExpr: string,
): boolean {
  if (!filterExpr.startsWith("(") || !filterExpr.endsWith(")")) return false;
  const clauses = filterExpr.slice(1, -1).split(",");
  if (clauses.length === 0 || clauses.length > 10) return false;

  const record = row as Record<string, unknown>;
  return clauses.some((clause) => {
    const match = /^([a-z_]+)\.(ilike|like)\.(.*)$/.exec(clause);
    if (!match) return false;
    const [, field, operator, pattern] = match;
    return matchesPostgrestOperator(record[field!], `${operator}.${pattern}`);
  });
}

/** Appends a "change" row to the shared audit log, as the real backend does for department-head writes. */
function recordMockAudit(
  persona: MockPersona,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    studentId?: string | null;
    label: string;
    details: string;
  },
) {
  const db = getMockDatabase();
  const student = entry.studentId
    ? db.profiles.find((profile) => profile.id === entry.studentId)
    : undefined;
  db.auditLogEntries.push({
    id: nextSyntheticUuid(),
    actor_id: persona.profileId,
    actor_name: persona.fullName,
    actor_role: persona.primaryRole,
    student_id: entry.studentId ?? null,
    student_name: student?.full_name ?? null,
    student_number: student?.student_number ?? null,
    target_label: entry.label,
    action: entry.action,
    action_category: "change",
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    details_summary: entry.details,
    old_value: null,
    new_value: null,
    reason: null,
    created_at: new Date().toISOString(),
  });
}

function applyPostgrestQuery<T extends object>(
  rows: readonly T[],
  url: URL,
): Response {
  const reservedParams = new Set([
    "select",
    "order",
    "limit",
    "offset",
    "and",
    "or",
  ]);
  let filtered = [...rows];

  url.searchParams.forEach((value, key) => {
    if (reservedParams.has(key)) return;
    filtered = filtered.filter((row) => {
      const record = row as Record<string, unknown>;
      return matchesPostgrestOperator(record[key], value);
    });
  });

  const orParam = url.searchParams.get("or");
  if (orParam) {
    filtered = filtered.filter((row) =>
      matchesPostgrestDisjunction(row, orParam),
    );
  }

  const andParam = url.searchParams.get("and");
  if (andParam) {
    const m =
      /^\(created_at\.(gte|gt)\.([^,]+),created_at\.(lte|lt)\.([^)]+)\)$/.exec(
        andParam,
      );
    if (!m)
      return errorJson(400, "INVALID_FILTER", "Invalid date range filter.");
    filtered = filtered.filter((row) => {
      const value = (row as Record<string, unknown>).created_at;
      return (
        matchesPostgrestOperator(value, `${m[1]}.${m[2]}`) &&
        matchesPostgrestOperator(value, `${m[3]}.${m[4]}`)
      );
    });
  }

  const order = url.searchParams.get("order");
  if (order) {
    const terms = order
      .split(",")
      .map((term) =>
        /^([a-z_][a-z0-9_]*)(?:\.(asc|desc))?(?:\.nulls(first|last))?$/i.exec(
          term,
        ),
      );
    if (
      terms.some((term) => !term) ||
      (filtered.length > 0 &&
        terms.some(
          (term) =>
            term && !(term[1]! in (filtered[0] as Record<string, unknown>)),
        ))
    )
      return errorJson(400, "INVALID_ORDER", "Invalid ordering.");
    filtered.sort((left, right) => {
      for (const term of terms) {
        if (!term) continue;
        const [, key, direction = "asc", nulls] = term;
        const a = (left as Record<string, unknown>)[key!],
          b = (right as Record<string, unknown>)[key!];
        if (a == null || b == null) {
          if (a == null && b == null) continue;
          const nullsFirst = nulls
            ? nulls.toLowerCase() === "first"
            : direction!.toLowerCase() === "desc";
          return a == null ? (nullsFirst ? -1 : 1) : nullsFirst ? 1 : -1;
        }
        const comparison = comparePostgrestValues(a, String(b)) ?? 0;
        if (comparison)
          return direction!.toLowerCase() === "desc" ? -comparison : comparison;
      }
      return 0;
    });
  }

  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  if (
    (limitParam !== null && !/^\d+$/.test(limitParam)) ||
    (offsetParam !== null && !/^\d+$/.test(offsetParam))
  )
    return errorJson(400, "INVALID_PAGINATION", "Invalid limit or offset.");
  const total = filtered.length;
  const offset = offsetParam === null ? 0 : Number(offsetParam);
  const limit = limitParam === null ? Math.max(total, 20) : Number(limitParam);
  if (
    !Number.isSafeInteger(offset) ||
    offset > 100000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 1000
  )
    return errorJson(400, "INVALID_PAGINATION", "Invalid limit or offset.");

  const paged = filtered.slice(offset, offset + limit);
  const contentRange =
    paged.length > 0
      ? `${offset}-${offset + paged.length - 1}/${total}`
      : `*/${total}`;

  return HttpResponse.json(paged, {
    status: 200,
    headers: {
      "Content-Range": contentRange,
    },
  });
}

function isCurrentAdviser(persona: MockPersona, studentId: string): boolean {
  return (
    persona.roles.includes("adviser") &&
    getMockDatabase().adviserAssignments.some(
      (assignment) =>
        assignment.student_id === studentId &&
        assignment.adviser_id === persona.profileId &&
        assignment.end_date === null,
    )
  );
}

function canAccessStudentRecord(
  persona: MockPersona,
  studentId: string,
  allowHistoric = false,
): boolean {
  if (persona.roles.includes("admin")) return true;
  const db = getMockDatabase();
  if (persona.roles.includes("student") && persona.profileId === studentId)
    return true;
  const adviserAssignment = db.adviserAssignments.find(
    (a) =>
      a.student_id === studentId &&
      a.adviser_id === persona.profileId &&
      (a.end_date === null || allowHistoric),
  );
  if (persona.roles.includes("adviser") && adviserAssignment) return true;
  const org = db.studentOrganizations.find((s) => s.student_id === studentId);
  if (!org) return false;
  return (
    (persona.roles.includes("dean") &&
      canAccessFaculty(persona, org.faculty_id)) ||
    (persona.roles.some(
      (role) => role === "department_head" || role === "department_staff",
    ) &&
      canAccessDepartment(persona, org.department_id))
  );
}

export const saaisMswHandlers = [
  // ===========================================================================
  // 1. Pre-login / Public & Auth Edge Functions
  // ===========================================================================
  http.get("*/functions/v1/health", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return HttpResponse.json({
      status: "ok",
      service: "saais-api",
      timestamp: "2026-11-10T08:00:00Z",
    });
  }),

  http.post("*/functions/v1/auth/preview-invite", async ({ request }) => {
    const missingKey = requireApiKey(request);
    if (missingKey) return missingKey;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"PreviewInviteRequest"> | null;
    if (!body?.token || body.token.trim().length < 8) {
      return errorJson(400, "INVALID_TOKEN", "Invitation token is invalid.");
    }
    const token = body.token.trim();
    if (token === "expired-invite-token") {
      return errorJson(409, "INVITE_EXPIRED", "Invitation token has expired.");
    }
    const db = getMockDatabase();
    const invitedProfiles = db.profiles.filter((p) => p.status === "invited");
    const matchedProfile =
      (token.startsWith("invite:")
        ? db.profiles.find((p) => p.id === token.slice("invite:".length))
        : undefined) ??
      invitedProfiles.find((p) => token.includes(p.id)) ??
      db.profiles.find(
        (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
      ) ??
      invitedProfiles[0];

    if (!matchedProfile) {
      return errorJson(404, "INVITE_NOT_FOUND", "Invitation not found.");
    }
    if (matchedProfile.status !== "invited") {
      return errorJson(
        409,
        "INVITE_ALREADY_USED",
        "Invitation has already been activated.",
      );
    }
    if (matchedProfile.invitation_status === "revoked") {
      return errorJson(409, "INVITE_REVOKED", "Invitation has been revoked.");
    }
    const dept = db.departments.find(
      (d) => d.id === matchedProfile.department_id,
    );
    const faculty = db.faculties.find(
      (f) => f.id === matchedProfile.faculty_id,
    );
    const response: ApiSchema<"PreviewInviteResponse"> = {
      valid: true,
      status: matchedProfile.invitation_status ?? "pending",
      email: matchedProfile.email,
      full_name: matchedProfile.full_name,
      role: matchedProfile.role,
      roles: matchedProfile.roles,
      faculty_name: faculty?.name ?? "Faculty of Computing",
      department_name:
        dept?.name ?? "Department of Computer Science and Technology",
      program_code: matchedProfile.role === "student" ? "BSCS" : null,
      expires_at:
        matchedProfile.invitation_expires_at ?? "2026-12-31T23:59:59Z",
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.post("*/functions/v1/auth/verify-invite", async ({ request }) => {
    const missingKey = requireApiKey(request);
    if (missingKey) return missingKey;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"VerifyInviteRequest"> | null;
    if (!body?.token || !body?.password) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Token and password are required.",
      );
    }
    if (body.password.length < 12 || body.password.length > 128) {
      return errorJson(
        400,
        "WEAK_PASSWORD",
        "Password must be between 12 and 128 characters.",
      );
    }
    const token = body.token.trim();
    const db = getMockDatabase();
    const invitedProfiles = db.profiles.filter((p) => p.status === "invited");
    const matchedProfile =
      (token.startsWith("invite:")
        ? db.profiles.find((p) => p.id === token.slice("invite:".length))
        : undefined) ??
      invitedProfiles.find((p) => token.includes(p.id)) ??
      db.profiles.find(
        (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
      ) ??
      invitedProfiles[0];

    if (!matchedProfile) {
      return errorJson(404, "INVITE_NOT_FOUND", "Invitation not found.");
    }
    if (matchedProfile.invitation_status === "revoked") {
      return errorJson(409, "INVITE_REVOKED", "Invitation has been revoked.");
    }
    if (matchedProfile.status !== "invited") {
      return errorJson(
        409,
        "INVITE_ALREADY_USED",
        "Invitation has already been activated.",
      );
    }
    db.profiles = db.profiles.map((p) =>
      p.id === matchedProfile.id
        ? { ...p, status: "active", invitation_status: "accepted" }
        : p,
    );

    const response: ApiSchema<"VerifyInviteResponse"> = {
      success: true,
      message: "Account successfully activated.",
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.post("*/functions/v1/auth/decline-invite", async ({ request }) => {
    const missingKey = requireApiKey(request);
    if (missingKey) return missingKey;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"DeclineInviteRequest"> | null;
    if (!body?.token) {
      return errorJson(400, "INVALID_TOKEN", "Invitation token is required.");
    }
    const token = body.token.trim();
    const db = getMockDatabase();
    const invitedProfiles = db.profiles.filter((p) => p.status === "invited");
    const matchedProfile =
      (token.startsWith("invite:")
        ? db.profiles.find((p) => p.id === token.slice("invite:".length))
        : undefined) ??
      invitedProfiles.find((p) => token.includes(p.id)) ??
      db.profiles.find(
        (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
      ) ??
      invitedProfiles[0];

    if (matchedProfile) {
      db.profiles = db.profiles.map((p) =>
        p.id === matchedProfile.id
          ? { ...p, invitation_status: "declined" }
          : p,
      );
    }

    const response: ApiSchema<"DeclineInviteResponse"> = {
      success: true,
      message: "Invitation declined.",
      invitation_status: "declined",
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.post("*/functions/v1/auth/invite", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"InviteRequest"> | null;
    if (!body || !body.email || !body.full_name || !body.role) {
      return errorJson(400, "INVALID_INPUT", "Missing required invite fields.");
    }
    if (body.email.toLowerCase() === persona.email.toLowerCase()) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Cannot assign roles to yourself.",
      );
    }

    if (!persona.roles.includes("admin")) {
      const assignments = body.role_assignments ?? [];
      if (
        !departmentInviteRoles.has(body.role) ||
        assignments.some((a) => !departmentInviteRoles.has(a.role))
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          `Department Head / Staff cannot provision role '${body.role}'.`,
          "Only student, adviser, department_staff, and department_head are allowed within caller department.",
        );
      }
      if (
        "department_id" in body &&
        body.department_id &&
        body.department_id !== persona.departmentId
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot provision accounts outside your assigned department.",
        );
      }
      if (
        "department_id" in body &&
        body.department_id === null &&
        !persona.departmentId
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "A department invitation requires an assigned department.",
        );
      }
      const program =
        body.role === "student"
          ? getMockDatabase().programs.find((p) => p.id === body.program_id)
          : undefined;
      if (
        assignments.some(
          (a) =>
            (a.department_id && a.department_id !== persona.departmentId) ||
            (a.faculty_id && a.faculty_id !== persona.facultyId),
        ) ||
        (body.role === "student" &&
          (!program || program.department_id !== persona.departmentId)) ||
        ("faculty_id" in body &&
          body.faculty_id &&
          body.faculty_id !== persona.facultyId)
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot provision this account within your department.",
        );
      }
    }

    const db = getMockDatabase();
    if (
      db.profiles.some(
        (p) => p.email.toLowerCase() === body.email.toLowerCase(),
      )
    ) {
      return errorJson(
        409,
        "DUPLICATE_EMAIL",
        `An account with email '${body.email}' already exists.`,
      );
    }

    if (
      body.role !== "student" &&
      body.role_assignments?.some((a) => a.role === "student")
    ) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Student roles require student provisioning details and an initial adviser.",
      );
    }
    if (body.role === "student") {
      const adviser = db.profiles.find(
        (p) =>
          p.id === body.adviser_id &&
          p.status === "active" &&
          p.roles?.includes("adviser"),
      );
      const program = db.programs.find((p) => p.id === body.program_id);
      const curriculum = db.curriculumVersions.find(
        (c) =>
          c.id === body.curriculum_version_id &&
          c.program_id === body.program_id &&
          c.status === "active",
      );
      if (
        !body.adviser_id ||
        !adviser ||
        !program ||
        !curriculum ||
        adviser.department_id !== program.department_id
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "An eligible active adviser and matching active curriculum are required.",
        );
      }
    }

    const newProfileId = nextSyntheticUuid();
    const assignedFacultyId =
      "faculty_id" in body
        ? (body.faculty_id ?? null)
        : (persona.facultyId ?? MOCK_IDS.facultyComputing);
    const assignedDepartmentId =
      !persona.roles.includes("admin") &&
      "department_id" in body &&
      body.department_id === null
        ? (persona.departmentId ?? null)
        : "department_id" in body
          ? (body.department_id ?? null)
          : (persona.departmentId ?? MOCK_IDS.deptDcst);
    db.profiles.push({
      id: newProfileId,
      role: body.role,
      roles: [
        ...new Set([
          body.role,
          ...(body.role_assignments ?? []).map((a) => a.role),
        ]),
      ],
      email: body.email,
      full_name: body.full_name,
      student_number:
        body.role === "student" && "student_number" in body
          ? body.student_number
          : null,
      status: "invited",
      invitation_status: "pending",
      invitation_sent_at: "2026-11-10T08:00:00Z",
      invitation_expires_at: "2026-11-17T08:00:00Z",
      created_at: "2026-11-10T08:00:00Z",
      updated_at: "2026-11-10T08:00:00Z",
      faculty_id: assignedFacultyId,
      department_id: assignedDepartmentId,
      avatar_url: null,
      consultation_hours: null,
    });

    db.roleAssignments.push(
      ...(body.role_assignments ?? []).map((assignment) => ({
        id: nextSyntheticUuid(),
        profile_id: newProfileId,
        role: assignment.role,
        faculty_id: assignment.faculty_id ?? null,
        department_id: assignment.department_id ?? null,
        created_at: "2026-11-10T08:00:00Z",
      })),
    );

    if (body.role === "student") {
      const adviser = db.profiles.find((p) => p.id === body.adviser_id)!;
      const program = db.programs.find((p) => p.id === body.program_id)!;
      const assignmentId = nextSyntheticUuid();
      db.studentCurriculumAssignments.push({
        id: assignmentId,
        student_id: newProfileId,
        curriculum_version_id: body.curriculum_version_id,
        start_date: "2026-11-10",
        end_date: null,
        change_note: "Initial curriculum assignment",
        created_at: "2026-11-10T08:00:00Z",
      });
      db.studentOrganizations.push({
        student_id: newProfileId,
        student_curriculum_assignment_id: assignmentId,
        curriculum_version_id: body.curriculum_version_id,
        program_id: body.program_id,
        department_id: program.department_id,
        faculty_id: adviser.faculty_id,
        adviser_id: body.adviser_id,
        entry_year: body.entry_year ?? null,
      });
      db.adviserAssignments.push({
        id: nextSyntheticUuid(),
        student_id: newProfileId,
        adviser_id: body.adviser_id,
        adviser_name: adviser.full_name,
        adviser_email: adviser.email,
        adviser_faculty_name: null,
        adviser_consultation_hours: adviser.consultation_hours ?? null,
        start_date: "2026-11-10",
        end_date: null,
        handed_over_to_adviser_id: null,
        handed_over_to_name: null,
        handover_label: null,
        created_at: "2026-11-10T08:00:00Z",
      });
    }

    const response: ApiSchema<"InviteResponse"> = {
      success: true,
      message: "Invitation email dispatched successfully.",
      profile_id: newProfileId,
      invitation_status: "pending",
      invitation_sent_at: "2026-11-10T08:00:00Z",
      invitation_expires_at: "2026-11-17T08:00:00Z",
    };
    return HttpResponse.json(response, { status: 201 });
  }),

  // ===========================================================================
  // 2. PostgREST Read Projections (/rest/v1/*)
  // ===========================================================================
  http.get("*/rest/v1/profile", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = persona.roles.includes("student")
      ? db.profiles.filter((p) => p.id === persona.profileId)
      : db.profiles;
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/role_assignment", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = persona.roles.includes("student")
      ? db.roleAssignments.filter((r) => r.profile_id === persona.profileId)
      : db.roleAssignments;
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/faculty", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().faculties,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/department", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().departments,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/program", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().programs,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/curriculum_version", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().curriculumVersions,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/curriculum_term", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().curriculumTerms,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/curriculum_term_course", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().curriculumTermCourses,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/course", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(getMockDatabase().courses, new URL(request.url));
  }),

  http.get("*/rest/v1/prerequisite", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().prerequisites,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/curriculum_pair_equivalence", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().curriculumPairEquivalences,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/school_term", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().schoolTerms,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/department_term_encoding", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().departmentTermEncodings,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/course_offering", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().courseOfferings,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/adviser_assignment", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.adviserAssignments.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/student_curriculum_assignment", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.studentCurriculumAssignments.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/student_organization", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.studentOrganizations.filter((s) =>
      canAccessStudentRecord(persona, s.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/attempt", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.attempts.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/attempt_result", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.attemptResults.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(markRetakeResults(rows), new URL(request.url));
  }),

  http.get("*/rest/v1/inc_resolution", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.incResolutions.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/elective_mapping", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.electiveMappings.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/equivalency_decision", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.equivalencyDecisions.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/outside_credit", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.outsideCredits.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/curriculum_transfer_request", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.curriculumTransferRequests.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/advising_plan", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.advisingPlans.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/advising_plan_item", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.advisingPlanItems.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/advising_note", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.advisingNotes.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/attempt_remark", ({ request }) => {
    const auth = authenticateRequest(request, [
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const db = getMockDatabase();
    return applyPostgrestQuery(db.attemptRemarks, new URL(request.url));
  }),

  http.get("*/rest/v1/grade_flag", ({ request }) => {
    const auth = authenticateRequest(request, [
      "student",
      "adviser",
      "department_head",
      "dean",
      "admin",
    ]);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.gradeFlags.filter((a) =>
      canAccessStudentRecord(persona, a.student_id, true),
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/notification", ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const { persona } = auth;
    const db = getMockDatabase();
    const rows = db.notifications.filter(
      (n) => n.recipient_id === persona.profileId,
    );
    return applyPostgrestQuery(rows, new URL(request.url));
  }),

  http.get("*/rest/v1/system_settings", ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "dean",
      "department_head",
      "adviser",
    ]);
    if ("response" in auth) return auth.response;
    const visibleSettings = auth.persona.roles.includes("admin")
      ? getMockDatabase().systemSettings.filter(
          (setting) => setting.department_id === null,
        )
      : getMockDatabase().systemSettings.filter(
          (setting) => setting.department_id === auth.persona.departmentId,
        );
    return applyPostgrestQuery(visibleSettings, new URL(request.url));
  }),

  http.get("*/rest/v1/audit_log", ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "dean",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    return applyPostgrestQuery(
      getMockDatabase().auditLogEntries,
      new URL(request.url),
    );
  }),

  http.get("*/rest/v1/audit_log_entry", ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "dean",
      "department_head",
      "adviser",
    ]);
    if ("response" in auth) return auth.response;
    const db = getMockDatabase();
    const rows = auth.persona.roles.includes("admin")
      ? db.auditLogEntries
      : db.auditLogEntries.filter(
          (entry) =>
            entry.actor_id === auth.persona.profileId ||
            (entry.student_id &&
              canAccessStudentRecord(auth.persona, entry.student_id, true)),
        );
    return applyPostgrestQuery(
      [...rows].sort(
        (left, right) =>
          right.created_at.localeCompare(left.created_at) ||
          right.id.localeCompare(left.id),
      ),
      new URL(request.url),
    );
  }),

  // ===========================================================================
  // 3. Accounts & Directory Edge Functions
  // ===========================================================================
  http.get("*/functions/v1/accounts", ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "dean",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const db = getMockDatabase();
    const params = new URL(request.url).searchParams;
    const requestedDepartmentId = params.get("department_id");
    const requestedFacultyId = params.get("faculty_id");
    if (
      requestedDepartmentId &&
      !canAccessDepartment(auth.persona, requestedDepartmentId)
    ) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Cannot view accounts outside your authorized organization scope.",
      );
    }
    if (
      requestedFacultyId &&
      !canAccessFaculty(auth.persona, requestedFacultyId)
    ) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Cannot view accounts outside your authorized organization scope.",
      );
    }
    const requiresDepartmentScope =
      auth.persona.roles.includes("department_staff") ||
      auth.persona.roles.includes("department_head");
    const departmentId =
      requestedDepartmentId ??
      (requiresDepartmentScope ? auth.persona.departmentId : null);
    const requiresFacultyScope =
      auth.persona.roles.includes("dean") &&
      !auth.persona.roles.includes("admin") &&
      !requiresDepartmentScope;
    const facultyId =
      requestedFacultyId ??
      (requiresFacultyScope ? auth.persona.facultyId : null);
    if (requiresDepartmentScope && !departmentId) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "An assigned department scope is required to view accounts.",
      );
    }
    if (requiresFacultyScope && !facultyId) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "An assigned faculty scope is required to view accounts.",
      );
    }

    const rawLimit = params.get("limit");
    const rawOffset = params.get("offset");
    const limit =
      rawLimit === null ? 20 : /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
    const offset =
      rawOffset === null
        ? 0
        : /^\d+$/.test(rawOffset)
          ? Number(rawOffset)
          : NaN;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1000 ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100_000
    ) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Account pagination parameters are outside the supported range.",
      );
    }

    const summaries: ApiSchema<"AccountSummary">[] = db.profiles.map(
      (profile) => ({
        profile,
        role_assignments: db.roleAssignments.filter(
          (r) => r.profile_id === profile.id,
        ),
        student_organization:
          db.studentOrganizations.find((s) => s.student_id === profile.id) ??
          null,
      }),
    );
    const search = params.get("search")?.trim().toLowerCase() ?? "";
    const requestedRole = params.get("role");
    const filtered = summaries.filter((summary) => {
      const {
        profile,
        role_assignments: assignments,
        student_organization,
      } = summary;
      const roles = new Set([
        profile.role,
        ...(profile.roles ?? []),
        ...assignments.map((assignment) => assignment.role),
      ]);
      if (
        requestedRole &&
        !Array.from(roles).some(
          (assignedRole) => assignedRole === requestedRole,
        )
      ) {
        return false;
      }

      if (
        search &&
        ![profile.full_name, profile.email, profile.student_number ?? ""].some(
          (value) => value.toLowerCase().includes(search),
        )
      ) {
        return false;
      }

      if (
        departmentId &&
        student_organization?.department_id !== departmentId &&
        profile.department_id !== departmentId &&
        !assignments.some(
          (assignment) => assignment.department_id === departmentId,
        )
      ) {
        return false;
      }
      if (facultyId) {
        const assignedDepartmentIds = [
          profile.department_id,
          ...assignments.map((assignment) => assignment.department_id),
          student_organization?.department_id,
        ].filter((id): id is string => Boolean(id));
        const assignedFacultyIds = [
          profile.faculty_id,
          ...assignments.map((assignment) => assignment.faculty_id),
          student_organization?.faculty_id,
          ...db.departments
            .filter((department) =>
              assignedDepartmentIds.includes(department.id),
            )
            .map((department) => department.faculty_id),
        ].filter((id): id is string => Boolean(id));
        if (!assignedFacultyIds.includes(facultyId)) return false;
      }
      return true;
    });
    return HttpResponse.json(filtered.slice(offset, offset + limit), {
      status: 200,
    });
  }),

  http.patch(
    "*/functions/v1/accounts/:profile_id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin"]);
      if ("response" in auth) return auth.response;
      const profileId = String(params.profile_id);
      const db = getMockDatabase();
      const profile = db.profiles.find((p) => p.id === profileId);
      if (!profile) {
        return errorJson(404, "NOT_FOUND", "Profile not found.");
      }
      let parsedBody: unknown;
      try {
        parsedBody = await request.json();
      } catch {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Expected a JSON account update.",
        );
      }
      if (
        !parsedBody ||
        typeof parsedBody !== "object" ||
        Array.isArray(parsedBody)
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Expected a JSON account update.",
        );
      }
      const body = parsedBody as ApiSchema<"AdminProfileUpdate">;
      if (
        Object.prototype.hasOwnProperty.call(parsedBody, "role_assignments") &&
        !isRoleAssignmentList(
          (parsedBody as Record<string, unknown>).role_assignments,
        )
      ) {
        return errorJson(400, "INVALID_INPUT", "Role assignments are invalid.");
      }
      const requestedAssignments = body.role_assignments;
      if (
        profile.role !== "student" &&
        ((body.role ?? profile.role) === "student" ||
          requestedAssignments?.some(
            (assignment) => assignment.role === "student",
          ))
      ) {
        return errorJson(
          409,
          "CONFLICT",
          "An existing account cannot be converted to a student account.",
        );
      }
      const existingRoleAssignments = db.roleAssignments.filter(
        (assignment) => assignment.profile_id === profileId,
      );
      const replacementAssignments = requestedAssignments?.map(
        (assignment) => ({
          id: nextSyntheticUuid(),
          profile_id: profileId,
          role: assignment.role,
          faculty_id: assignment.faculty_id ?? null,
          department_id: assignment.department_id ?? null,
          created_at: "2026-11-10T09:00:00Z",
        }),
      );
      const updated: ApiSchema<"Profile"> = {
        ...profile,
        ...(body.full_name !== undefined ? { full_name: body.full_name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.role !== undefined || body.role_assignments !== undefined
          ? {
              roles: [
                ...new Set([
                  body.role ?? profile.role,
                  ...(requestedAssignments ?? existingRoleAssignments).map(
                    (assignment) => assignment.role,
                  ),
                ]),
              ],
            }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.faculty_id !== undefined
          ? { faculty_id: body.faculty_id }
          : {}),
        ...(body.department_id !== undefined
          ? { department_id: body.department_id }
          : {}),
        ...(body.student_number !== undefined
          ? { student_number: body.student_number }
          : {}),
        ...(body.avatar_url !== undefined
          ? { avatar_url: body.avatar_url }
          : {}),
        ...(body.consultation_hours !== undefined
          ? { consultation_hours: body.consultation_hours }
          : {}),
        updated_at: "2026-11-10T09:00:00Z",
      };
      if (replacementAssignments) {
        db.roleAssignments = db.roleAssignments.filter(
          (assignment) => assignment.profile_id !== profileId,
        );
        db.roleAssignments.push(...replacementAssignments);
      }
      const idx = db.profiles.findIndex((p) => p.id === profileId);
      db.profiles[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/accounts/:profile_id/resend-invite",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const profileId = String(params.profile_id);
      const db = getMockDatabase();
      const profile = db.profiles.find((p) => p.id === profileId);
      if (!profile) {
        return errorJson(404, "NOT_FOUND", "Account not found.");
      }
      if (!canManageDepartmentInvite(auth.persona, profile)) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot manage this invitation.",
        );
      }
      if (
        profile.status !== "invited" ||
        !resendableInvitationStates.has(profile.invitation_status ?? "")
      ) {
        return errorJson(
          409,
          "INVITATION_NOT_RESENDABLE",
          "This invitation is no longer eligible to resend. Refresh account status.",
        );
      }
      const resentAt = "2026-11-17T09:00:00Z";
      const expiresAt = "2026-11-24T09:00:00Z";
      const index = db.profiles.findIndex((item) => item.id === profileId);
      db.profiles[index] = {
        ...profile,
        invitation_status: "pending",
        invitation_sent_at: resentAt,
        invitation_expires_at: expiresAt,
        updated_at: resentAt,
      };
      const res: ApiSchema<"ResendInviteResponse"> = {
        success: true,
        message: "Invitation regenerated and dispatched.",
        profile_id: profileId,
        invitation_status: "pending",
        invitation_sent_at: resentAt,
        invitation_expires_at: expiresAt,
      };
      return HttpResponse.json(res, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/accounts/:profile_id/revoke-invite",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const profileId = String(params.profile_id);
      const db = getMockDatabase();
      const profile = db.profiles.find((p) => p.id === profileId);
      if (!profile) {
        return errorJson(404, "NOT_FOUND", "Account not found.");
      }
      if (!canManageDepartmentInvite(auth.persona, profile)) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot manage this invitation.",
        );
      }
      if (
        profile.status !== "invited" ||
        profile.invitation_status !== "pending"
      ) {
        return errorJson(
          409,
          "INVITATION_NOT_REVOCABLE",
          "This invitation is no longer pending. Refresh account status.",
        );
      }
      const updated: ApiSchema<"Profile"> = {
        ...profile,
        invitation_status: "revoked",
        updated_at: "2026-11-17T09:30:00Z",
      };
      const idx = db.profiles.findIndex((p) => p.id === profileId);
      db.profiles[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  // ===========================================================================
  // 4. Catalog & Term Management (/functions/v1/catalog/* & /school-terms/*)
  // ===========================================================================
  http.post("*/functions/v1/catalog/faculty", async ({ request }) => {
    const auth = authenticateRequest(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"FacultyInsert"> | null;
    if (!body?.name) {
      return errorJson(400, "INVALID_INPUT", "Faculty name is required.");
    }
    const created: ApiSchema<"Faculty"> = {
      id: nextSyntheticUuid(),
      code: body.code ?? null,
      name: body.name,
      letterhead_prefix: body.letterhead_prefix ?? null,
      letterhead_name: body.letterhead_name ?? null,
      dean_name: null,
    };
    getMockDatabase().faculties.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/faculty/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin"]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.faculties.findIndex((f) => f.id === id);
      if (idx === -1) return errorJson(404, "NOT_FOUND", "Faculty not found.");
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"FacultyUpdate">;
      const updated: ApiSchema<"Faculty"> = { ...db.faculties[idx]!, ...body };
      db.faculties[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete("*/functions/v1/catalog/faculty/:id", ({ request, params }) => {
    const auth = authenticateRequest(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const id = String(params.id);
    const db = getMockDatabase();
    const idx = db.faculties.findIndex((f) => f.id === id);
    if (idx === -1) return errorJson(404, "NOT_FOUND", "Faculty not found.");
    if (db.departments.some((d) => d.faculty_id === id)) {
      return errorJson(
        409,
        "DEPENDENT_RECORDS_EXIST",
        "Cannot delete a faculty that still has dependent departments.",
      );
    }
    db.faculties.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/functions/v1/catalog/department", async ({ request }) => {
    const auth = authenticateRequest(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"DepartmentInsert"> | null;
    if (!body?.name || !body?.faculty_id) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Department name and faculty_id are required.",
      );
    }
    const created: ApiSchema<"Department"> = {
      id: nextSyntheticUuid(),
      faculty_id: body.faculty_id,
      code: body.code ?? null,
      name: body.name,
      letterhead_prefix: body.letterhead_prefix ?? null,
      letterhead_name: body.letterhead_name ?? null,
      department_head_name: null,
      dean_name: null,
    };
    getMockDatabase().departments.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/department/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "department_head"]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.departments.findIndex((d) => d.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Department not found.");
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"DepartmentUpdate">;
      const updated: ApiSchema<"Department"> = {
        ...db.departments[idx]!,
        ...body,
      };
      db.departments[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/catalog/department/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin"]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.departments.findIndex((d) => d.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Department not found.");
      if (db.programs.some((p) => p.department_id === id)) {
        return errorJson(
          409,
          "DEPENDENT_RECORDS_EXIST",
          "Cannot delete a department that still has dependent programs.",
        );
      }
      db.departments.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post("*/functions/v1/catalog/program", async ({ request }) => {
    const auth = authenticateRequest(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"ProgramInsert"> | null;
    if (!body?.code || !body?.name || !body?.department_id) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Program code, name, and department_id are required.",
      );
    }
    const created: ApiSchema<"Program"> = {
      id: nextSyntheticUuid(),
      code: body.code,
      name: body.name,
      nominal_duration: body.nominal_duration ?? 4,
      status: body.status ?? "active",
      department_id: body.department_id,
    };
    getMockDatabase().programs.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/program/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin"]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.programs.findIndex((p) => p.id === id);
      if (idx === -1) return errorJson(404, "NOT_FOUND", "Program not found.");
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"ProgramUpdate">;
      const updated: ApiSchema<"Program"> = { ...db.programs[idx]!, ...body };
      db.programs[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete("*/functions/v1/catalog/program/:id", ({ request, params }) => {
    const auth = authenticateRequest(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const id = String(params.id);
    const db = getMockDatabase();
    const idx = db.programs.findIndex((p) => p.id === id);
    if (idx === -1) return errorJson(404, "NOT_FOUND", "Program not found.");
    if (db.curriculumVersions.some((c) => c.program_id === id)) {
      return errorJson(
        409,
        "DEPENDENT_RECORDS_EXIST",
        "Cannot delete a program that has curriculum versions.",
      );
    }
    db.programs.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(
    "*/functions/v1/catalog/curriculum_version",
    async ({ request }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const db = getMockDatabase();
      const cloneId = body.clone_from_version_id;
      if (
        cloneId != null &&
        !hasMockRole(auth.persona, ["department_head", "department_staff"])
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only an in-scope Department Head or Department Staff member may clone a curriculum.",
        );
      }
      const source =
        cloneId == null
          ? undefined
          : db.curriculumVersions.find((version) => version.id === cloneId);
      if (cloneId != null && !source)
        return errorJson(404, "NOT_FOUND", "Source curriculum not found.");
      if (source) {
        const sourceProgram = db.programs.find(
          (program) => program.id === source.program_id,
        );
        const targetProgram = db.programs.find(
          (program) => program.id === body.program_id,
        );
        if (
          !sourceProgram?.department_id ||
          sourceProgram.department_id !== targetProgram?.department_id ||
          !auth.persona.roleScopes.some(
            (scope) =>
              (scope.role === "department_head" ||
                scope.role === "department_staff") &&
              scope.scope_type === "department" &&
              scope.scope_id === sourceProgram.department_id,
          )
        ) {
          return errorJson(
            403,
            "INSUFFICIENT_PRIVILEGE",
            "Source and target must be within the assigned department scope.",
          );
        }
      }
      const created: ApiSchema<"CurriculumVersion"> = {
        id: nextSyntheticUuid(),
        program_id: String(body.program_id ?? MOCK_IDS.programBscs),
        version_label: String(body.version_label ?? "BSCS 2026-2027 v1"),
        effective_start: String(body.effective_start ?? "2026-08-01"),
        effective_end: null,
        delinquency_threshold: Number(body.delinquency_threshold ?? 24),
        total_units: Number(body.total_units ?? 162),
        status: "draft",
        enrolled_student_count: 0,
      };
      db.curriculumVersions.push(created);
      if (source) {
        const sourceTerms = db.curriculumTerms.filter(
          (term) => term.curriculum_version_id === source.id,
        );
        for (const term of sourceTerms) {
          const newTermId = nextSyntheticUuid();
          db.curriculumTerms.push({
            ...term,
            id: newTermId,
            curriculum_version_id: created.id,
          });
          const slots = db.curriculumTermCourses.filter(
            (slot) => slot.curriculum_term_id === term.id,
          );
          for (const slot of slots)
            db.curriculumTermCourses.push({
              ...slot,
              id: nextSyntheticUuid(),
              curriculum_term_id: newTermId,
            });
        }
      }
      return HttpResponse.json(created, { status: 201 });
    },
  ),

  http.patch(
    "*/functions/v1/catalog/curriculum_version/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumVersions.findIndex((c) => c.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Curriculum version not found.");
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"CurriculumVersionUpdate">;
      const updated: ApiSchema<"CurriculumVersion"> = {
        ...db.curriculumVersions[idx]!,
        ...body,
      };
      db.curriculumVersions[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/catalog/curriculum_version/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumVersions.findIndex((c) => c.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Curriculum version not found.");
      const version = db.curriculumVersions[idx]!;
      const program = db.programs.find((row) => row.id === version.program_id);
      if (!program)
        return errorJson(404, "NOT_FOUND", "Curriculum program not found.");
      if (!canAccessDepartment(auth.persona, program.department_id))
        return errorJson(
          403,
          "FORBIDDEN",
          "The curriculum is outside your authorized department.",
        );
      const referenced =
        (version.enrolled_student_count ?? 0) > 0 ||
        db.studentCurriculumAssignments.some(
          (row) => row.curriculum_version_id === version.id,
        ) ||
        db.studentOrganizations.some(
          (row) => row.curriculum_version_id === version.id,
        ) ||
        db.curriculumTransferRequests.some(
          (row) =>
            row.from_curriculum_version_id === version.id ||
            row.to_curriculum_version_id === version.id,
        ) ||
        db.curriculumPairEquivalences.some(
          (row) =>
            row.from_curriculum_version_id === version.id ||
            row.to_curriculum_version_id === version.id,
        );
      const termIds = new Set(
        db.curriculumTerms
          .filter((row) => row.curriculum_version_id === id)
          .map((row) => row.id),
      );
      const slotIds = new Set(
        db.curriculumTermCourses
          .filter((row) => termIds.has(row.curriculum_term_id))
          .map((row) => row.id),
      );
      const hasHistory =
        [
          ...db.attempts,
          ...db.attemptResults,
          ...db.advisingPlanItems,
          ...db.electiveMappings,
        ].some(
          (row) =>
            row.curriculum_term_course_id != null &&
            slotIds.has(row.curriculum_term_course_id),
        ) ||
        db.outsideCredits.some((row) =>
          slotIds.has(row.destination_curriculum_term_course_id),
        ) ||
        db.equivalencyDecisions.some((row) =>
          slotIds.has(row.destination_curriculum_term_course_id),
        );
      if (referenced || hasHistory)
        return errorJson(
          409,
          "DEPENDENT_RECORDS_EXIST",
          "Retire this curriculum to preserve student assignments, transfers, equivalence rules, or academic history.",
        );
      // The existing catalog workflow deletes an unreferenced structure together; never leave orphan children.
      db.curriculumTermCourses = db.curriculumTermCourses.filter(
        (row) => !slotIds.has(row.id),
      );
      db.curriculumTerms = db.curriculumTerms.filter(
        (row) => !termIds.has(row.id),
      );
      db.curriculumVersions.splice(idx, 1);
      recordMockAudit(auth.persona, {
        action: "curriculum_version_deleted",
        entityType: "curriculum_version",
        entityId: id,
        label: version.version_label,
        details: "Deleted an unreferenced curriculum structure.",
      });
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post("*/functions/v1/catalog/curriculum_term", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"CurriculumTermInsert"> | null;
    if (!body?.curriculum_version_id) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "curriculum_version_id is required.",
      );
    }
    const created: ApiSchema<"CurriculumTerm"> = {
      id: nextSyntheticUuid(),
      curriculum_version_id: body.curriculum_version_id,
      year_level: body.year_level,
      term_sequence: body.term_sequence,
    };
    getMockDatabase().curriculumTerms.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/curriculum_term/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumTerms.findIndex((t) => t.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Curriculum term not found.");
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"CurriculumTermUpdate">;
      const updated: ApiSchema<"CurriculumTerm"> = {
        ...db.curriculumTerms[idx]!,
        ...body,
      };
      db.curriculumTerms[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/catalog/curriculum_term/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumTerms.findIndex((t) => t.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Curriculum term not found.");
      const term = db.curriculumTerms[idx]!;
      const version = db.curriculumVersions.find(
        (row) => row.id === term.curriculum_version_id,
      );
      const program = db.programs.find((row) => row.id === version?.program_id);
      if (!version || !program)
        return errorJson(404, "NOT_FOUND", "Curriculum parent not found.");
      if (!canAccessDepartment(auth.persona, program.department_id))
        return errorJson(
          403,
          "FORBIDDEN",
          "The curriculum is outside your authorized department.",
        );
      const referenced =
        (version.enrolled_student_count ?? 0) > 0 ||
        db.studentCurriculumAssignments.some(
          (row) => row.curriculum_version_id === version.id,
        ) ||
        db.studentOrganizations.some(
          (row) => row.curriculum_version_id === version.id,
        ) ||
        db.curriculumTransferRequests.some(
          (row) =>
            row.from_curriculum_version_id === version.id ||
            row.to_curriculum_version_id === version.id,
        ) ||
        db.curriculumPairEquivalences.some(
          (row) =>
            row.from_curriculum_version_id === version.id ||
            row.to_curriculum_version_id === version.id,
        );
      if (
        referenced &&
        db.curriculumTerms.filter(
          (row) => row.curriculum_version_id === version.id,
        ).length <= 1
      ) {
        return errorJson(
          409,
          "DEPENDENT_RECORDS_EXIST",
          "A referenced curriculum must retain at least one term.",
        );
      }
      const slotIds = new Set(
        db.curriculumTermCourses
          .filter((row) => row.curriculum_term_id === id)
          .map((row) => row.id),
      );
      const hasHistory =
        [
          ...db.attempts,
          ...db.attemptResults,
          ...db.advisingPlanItems,
          ...db.electiveMappings,
        ].some(
          (row) =>
            row.curriculum_term_course_id != null &&
            slotIds.has(row.curriculum_term_course_id),
        ) ||
        db.outsideCredits.some((row) =>
          slotIds.has(row.destination_curriculum_term_course_id),
        ) ||
        db.equivalencyDecisions.some((row) =>
          slotIds.has(row.destination_curriculum_term_course_id),
        );
      if (hasHistory)
        return errorJson(
          409,
          "DEPENDENT_RECORDS_EXIST",
          "This term contains slots used by academic history.",
        );
      db.curriculumTermCourses = db.curriculumTermCourses.filter(
        (row) => !slotIds.has(row.id),
      );
      db.curriculumTerms.splice(idx, 1);
      recordMockAudit(auth.persona, {
        action: "curriculum_term_deleted",
        entityType: "curriculum_term",
        entityId: id,
        label: version.version_label,
        details:
          "Deleted an unreferenced curriculum term and its unreferenced slots.",
      });
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post(
    "*/functions/v1/catalog/curriculum_term_course",
    async ({ request }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"CurriculumTermCourseInsert"> | null;
      if (!body?.curriculum_term_id) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "curriculum_term_id is required.",
        );
      }
      const db = getMockDatabase();
      const term = db.curriculumTerms.find(
        (item) => item.id === body.curriculum_term_id,
      );
      const version = db.curriculumVersions.find(
        (item) => item.id === term?.curriculum_version_id,
      );
      const program = db.programs.find(
        (item) => item.id === version?.program_id,
      );
      if (!term || !version || !program) {
        return errorJson(
          404,
          "NOT_FOUND",
          "The target curriculum term was not found.",
        );
      }
      if (!canAccessDepartment(auth.persona, program.department_id)) {
        return errorJson(
          403,
          "FORBIDDEN",
          "The target curriculum is outside the authorized department.",
        );
      }
      if (
        body.course_id &&
        !db.courses.some((course) => course.id === body.course_id)
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "The selected catalog course was not found.",
        );
      }
      const created: ApiSchema<"CurriculumTermCourse"> = {
        id: nextSyntheticUuid(),
        curriculum_term_id: body.curriculum_term_id,
        course_id: body.course_id ?? null,
        is_elective_slot: body.is_elective_slot,
        slot_type: body.slot_type,
        slot_label: body.slot_label ?? null,
        nominal_units: body.nominal_units,
      };
      db.curriculumTermCourses.push(created);
      return HttpResponse.json(created, { status: 201 });
    },
  ),

  http.patch(
    "*/functions/v1/catalog/curriculum_term_course/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumTermCourses.findIndex((c) => c.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Curriculum slot not found.");
      const existing = db.curriculumTermCourses[idx]!;
      const term = db.curriculumTerms.find(
        (item) => item.id === existing.curriculum_term_id,
      );
      const version = db.curriculumVersions.find(
        (item) => item.id === term?.curriculum_version_id,
      );
      const program = db.programs.find(
        (item) => item.id === version?.program_id,
      );
      if (!program)
        return errorJson(
          404,
          "NOT_FOUND",
          "The target curriculum was not found.",
        );
      if (!canAccessDepartment(auth.persona, program.department_id)) {
        return errorJson(
          403,
          "FORBIDDEN",
          "The target curriculum is outside the authorized department.",
        );
      }
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"CurriculumTermCourseUpdate">;
      const updated: ApiSchema<"CurriculumTermCourse"> = {
        ...db.curriculumTermCourses[idx]!,
        ...body,
      };
      db.curriculumTermCourses[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/catalog/curriculum_term_course/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumTermCourses.findIndex((c) => c.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Curriculum slot not found.");
      const term = db.curriculumTerms.find(
        (item) => item.id === db.curriculumTermCourses[idx]?.curriculum_term_id,
      );
      const version = db.curriculumVersions.find(
        (item) => item.id === term?.curriculum_version_id,
      );
      const program = db.programs.find(
        (item) => item.id === version?.program_id,
      );
      if (!program)
        return errorJson(
          404,
          "NOT_FOUND",
          "The target curriculum was not found.",
        );
      if (!canAccessDepartment(auth.persona, program.department_id)) {
        return errorJson(
          403,
          "FORBIDDEN",
          "The target curriculum is outside the authorized department.",
        );
      }
      if (!version || !term)
        return errorJson(404, "NOT_FOUND", "Curriculum parent not found.");
      const slotIds = new Set([id]);
      const hasHistory =
        [
          ...db.attempts,
          ...db.attemptResults,
          ...db.advisingPlanItems,
          ...db.electiveMappings,
        ].some(
          (row) =>
            row.curriculum_term_course_id != null &&
            slotIds.has(row.curriculum_term_course_id),
        ) ||
        db.outsideCredits.some((row) =>
          slotIds.has(row.destination_curriculum_term_course_id),
        ) ||
        db.equivalencyDecisions.some((row) =>
          slotIds.has(row.destination_curriculum_term_course_id),
        );
      if (hasHistory)
        return errorJson(
          409,
          "DEPENDENT_RECORDS_EXIST",
          "This slot is used by academic history.",
        );
      const referenced =
        (version.enrolled_student_count ?? 0) > 0 ||
        db.studentCurriculumAssignments.some(
          (row) => row.curriculum_version_id === version.id,
        ) ||
        db.studentOrganizations.some(
          (row) => row.curriculum_version_id === version.id,
        ) ||
        db.curriculumTransferRequests.some(
          (row) =>
            row.from_curriculum_version_id === version.id ||
            row.to_curriculum_version_id === version.id,
        ) ||
        db.curriculumPairEquivalences.some(
          (row) =>
            row.from_curriculum_version_id === version.id ||
            row.to_curriculum_version_id === version.id,
        );
      if (
        referenced &&
        db.curriculumTermCourses.filter(
          (row) => row.curriculum_term_id === term.id,
        ).length <= 1
      ) {
        return errorJson(
          409,
          "DEPENDENT_RECORDS_EXIST",
          "Each term in a referenced curriculum must retain at least one slot.",
        );
      }
      db.curriculumTermCourses.splice(idx, 1);
      recordMockAudit(auth.persona, {
        action: "curriculum_slot_deleted",
        entityType: "curriculum_term_course",
        entityId: id,
        label: version.version_label,
        details: "Deleted an unreferenced curriculum slot.",
      });
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post("*/functions/v1/catalog/course", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"CourseInsert"> | null;
    if (!body?.code || !body?.title || !body?.department_id) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "code, title, and department_id are required.",
      );
    }
    const db = getMockDatabase();
    if (
      !db.departments.some((department) => department.id === body.department_id)
    ) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "The requested department was not found.",
      );
    }
    if (!canAccessDepartment(auth.persona, body.department_id)) {
      return errorJson(
        403,
        "FORBIDDEN",
        "Cannot create a course outside the authorized department.",
      );
    }
    if (
      db.courses.some(
        (course) =>
          course.department_id === body.department_id &&
          course.code.trim().toLowerCase() === body.code.trim().toLowerCase(),
      )
    ) {
      return errorJson(
        409,
        "DUPLICATE_COURSE_CODE",
        "A course with this code already exists in the department.",
      );
    }
    const created: ApiSchema<"Course"> = {
      id: nextSyntheticUuid(),
      department_id: body.department_id,
      code: body.code,
      title: body.title,
      category: body.category ?? "major",
      units: body.units,
      is_elective: body.is_elective ?? false,
      status: body.status ?? "active",
      repeatable_type: body.repeatable_type ?? "none",
    };
    db.courses.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/course/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.courses.findIndex((c) => c.id === id);
      if (idx === -1) return errorJson(404, "NOT_FOUND", "Course not found.");
      if (!canAccessDepartment(auth.persona, db.courses[idx]!.department_id)) {
        return errorJson(
          403,
          "FORBIDDEN",
          "Course is outside the authorized department.",
        );
      }
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"CourseUpdate">;
      if (
        body.status === "discontinued" &&
        db.courses[idx]!.status !== "active"
      ) {
        return errorJson(
          409,
          "STALE_RECORD",
          "Only an active course can be discontinued.",
        );
      }
      const updated: ApiSchema<"Course"> = { ...db.courses[idx]!, ...body };
      db.courses[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete("*/functions/v1/catalog/course/:id", ({ request, params }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const id = String(params.id);
    const db = getMockDatabase();
    const idx = db.courses.findIndex((c) => c.id === id);
    if (idx === -1) return errorJson(404, "NOT_FOUND", "Course not found.");
    const course = db.courses[idx]!;
    if (!canAccessDepartment(auth.persona, course.department_id)) {
      return errorJson(
        403,
        "FORBIDDEN",
        "Course is outside the authorized department.",
      );
    }
    const offeringIds = new Set(
      db.courseOfferings
        .filter((offering) => offering.course_id === id)
        .map((offering) => offering.id),
    );
    const hasProtectedReferences =
      db.curriculumTermCourses.some((slot) => slot.course_id === id) ||
      db.courseOfferings.some((offering) => offering.course_id === id) ||
      db.prerequisites.some(
        (prerequisite) =>
          prerequisite.course_id === id ||
          prerequisite.prerequisite_course_id === id,
      ) ||
      db.attempts.some((attempt) =>
        offeringIds.has(attempt.course_offering_id),
      ) ||
      db.attemptResults.some((attempt) =>
        offeringIds.has(attempt.course_offering_id),
      );
    if (hasProtectedReferences) {
      return errorJson(
        409,
        "DEPENDENT_RECORDS_EXIST",
        "Cannot delete a course referenced by curriculum, offerings, prerequisites, or attempts. Discontinue it instead.",
      );
    }
    db.courses.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/functions/v1/catalog/prerequisite", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"PrerequisiteInsert"> | null;
    if (!body?.course_id || !body?.prerequisite_course_id) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "course_id and prerequisite_course_id are required.",
      );
    }
    const created: ApiSchema<"Prerequisite"> = {
      id: nextSyntheticUuid(),
      course_id: body.course_id,
      prerequisite_course_id: body.prerequisite_course_id,
      type: body.type,
    };
    getMockDatabase().prerequisites.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(
    "*/functions/v1/catalog/prerequisite/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.prerequisites.findIndex((p) => p.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Prerequisite not found.");
      db.prerequisites.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post(
    "*/functions/v1/catalog/curriculum-pair-equivalences",
    async ({ request }) => {
      const auth = authenticateRequest(request, ["admin", "department_head"]);
      if ("response" in auth) return auth.response;
      const body = (await request
        .json()
        .catch(
          () => null,
        )) as ApiSchema<"CurriculumPairEquivalenceInsert"> | null;
      const fields = [
        "from_curriculum_version_id",
        "to_curriculum_version_id",
        "source_course_id",
        "target_course_id",
        "note",
      ];
      const uuid = (value: unknown) =>
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        );
      if (
        !body ||
        Object.keys(body).some((key) => !fields.includes(key)) ||
        ![
          body.from_curriculum_version_id,
          body.to_curriculum_version_id,
          body.source_course_id,
          body.target_course_id,
        ].every(uuid) ||
        (body.note != null &&
          (typeof body.note !== "string" || body.note.length > 1000))
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Choose valid curriculum and course IDs and use at most 1,000 characters for the note.",
        );
      }
      const db = getMockDatabase();
      const versions = [
        body.from_curriculum_version_id,
        body.to_curriculum_version_id,
      ].map((id) => db.curriculumVersions.find((row) => row.id === id));
      if (
        versions.some((row) => !row) ||
        !db.courses.some((row) => row.id === body.source_course_id) ||
        !db.courses.some((row) => row.id === body.target_course_id)
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "The selected curriculum or course no longer exists.",
        );
      }
      if (
        versions.some(
          (version) =>
            !db.programs.some(
              (program) =>
                program.id === version?.program_id &&
                canAccessDepartment(auth.persona, program.department_id),
            ),
        )
      ) {
        return errorJson(
          403,
          "FORBIDDEN",
          "The curriculum pair is outside your authorized department.",
        );
      }
      if (
        db.curriculumPairEquivalences.some(
          (row) =>
            row.from_curriculum_version_id ===
              body.from_curriculum_version_id &&
            row.to_curriculum_version_id === body.to_curriculum_version_id &&
            (row.source_course_id === body.source_course_id ||
              row.target_course_id === body.target_course_id),
        )
      ) {
        return errorJson(
          409,
          "EQUIVALENCE_CONFLICT",
          "A selected course is already mapped in this curriculum pair.",
        );
      }
      const created: ApiSchema<"CurriculumPairEquivalence"> = {
        id: nextSyntheticUuid(),
        from_curriculum_version_id: body.from_curriculum_version_id,
        to_curriculum_version_id: body.to_curriculum_version_id,
        source_course_id: body.source_course_id,
        target_course_id: body.target_course_id,
        note: body.note ?? null,
        created_by: auth.persona.profileId,
        created_at: "2026-11-10T09:00:00Z",
      };
      getMockDatabase().curriculumPairEquivalences.push(created);
      recordMockAudit(auth.persona, {
        action: "curriculum_pair_equivalence_created",
        entityType: "curriculum_pair_equivalence",
        entityId: created.id,
        label: "Course equivalence",
        details: "Created a curriculum-pair course equivalence.",
      });
      return HttpResponse.json(created, { status: 201 });
    },
  ),

  http.delete(
    "*/functions/v1/catalog/curriculum-pair-equivalences/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "department_head"]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.curriculumPairEquivalences.findIndex((e) => e.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Equivalence rule not found.");
      const rule = db.curriculumPairEquivalences[idx]!;
      const versionIds = [
        rule.from_curriculum_version_id,
        rule.to_curriculum_version_id,
      ];
      if (
        versionIds.some(
          (versionId) =>
            !db.curriculumVersions.some(
              (version) =>
                version.id === versionId &&
                db.programs.some(
                  (program) =>
                    program.id === version.program_id &&
                    canAccessDepartment(auth.persona, program.department_id),
                ),
            ),
        )
      ) {
        return errorJson(
          403,
          "FORBIDDEN",
          "The curriculum pair is outside your authorized department.",
        );
      }
      db.curriculumPairEquivalences.splice(idx, 1);
      recordMockAudit(auth.persona, {
        action: "curriculum_pair_equivalence_deleted",
        entityType: "curriculum_pair_equivalence",
        entityId: id,
        label: "Course equivalence",
        details: "Deleted a curriculum-pair course equivalence rule.",
      });
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post("*/functions/v1/catalog/school_term", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"SchoolTermInsert"> | null;
    if (
      !body?.start_year ||
      !body?.end_year ||
      !body?.term_type ||
      !body?.ends_on
    ) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Missing required school term fields.",
      );
    }
    const created: ApiSchema<"SchoolTerm"> = {
      id: nextSyntheticUuid(),
      start_year: body.start_year,
      end_year: body.end_year,
      term_type: body.term_type,
      school_year: `${body.start_year} - ${body.end_year}`,
      is_locked: body.is_locked ?? false,
      override_flag: false,
      override_actor_id: null,
      override_at: null,
      starts_on: body.starts_on ?? null,
      ends_on: body.ends_on,
      encoding_deadline: body.encoding_deadline ?? null,
      closed_by: null,
      closed_at: null,
      closure_note: null,
      default_inc_deadline: `${body.start_year + 1}-12-18`,
      chronological_key: body.start_year * 10 + 1,
    };
    getMockDatabase().schoolTerms.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/school_term/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.schoolTerms.findIndex((t) => t.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "School term not found.");
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"SchoolTermUpdate">;
      const updated: ApiSchema<"SchoolTerm"> = {
        ...db.schoolTerms[idx]!,
        ...body,
      };
      db.schoolTerms[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.post("*/functions/v1/catalog/course_offering", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"CourseOfferingInsert"> | null;
    if (!body?.school_term_id || !body?.course_id) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "school_term_id and course_id are required.",
      );
    }
    const db = getMockDatabase();
    const course = db.courses.find((item) => item.id === body.course_id);
    if (!course) return errorJson(404, "NOT_FOUND", "Course not found.");
    if (!canAccessDepartment(auth.persona, course.department_id)) {
      return errorJson(
        403,
        "FORBIDDEN",
        "Course offering is outside the authorized department.",
      );
    }
    if (!db.schoolTerms.some((term) => term.id === body.school_term_id)) {
      return errorJson(404, "NOT_FOUND", "School term not found.");
    }
    if (
      course.status === "discontinued" &&
      (!body.is_by_request ||
        !isRequiredCourseInDepartment(course.id, course.department_id))
    ) {
      return errorJson(
        400,
        "INVALID_INPUT",
        "Discontinued courses may only be offered by request when required by a department curriculum.",
      );
    }
    const created: ApiSchema<"CourseOffering"> = {
      id: nextSyntheticUuid(),
      school_term_id: body.school_term_id,
      course_id: body.course_id,
      section: body.section ?? null,
      schedule: body.schedule ?? null,
      instructor: body.instructor ?? null,
      is_by_request: body.is_by_request ?? false,
    };
    db.courseOfferings.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(
    "*/functions/v1/catalog/course_offering/:id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.courseOfferings.findIndex((o) => o.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Course offering not found.");
      const current = db.courseOfferings[idx]!;
      const course = db.courses.find((item) => item.id === current.course_id);
      if (!course) return errorJson(404, "NOT_FOUND", "Course not found.");
      if (!canAccessDepartment(auth.persona, course.department_id)) {
        return errorJson(
          403,
          "FORBIDDEN",
          "Course offering is outside the authorized department.",
        );
      }
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"CourseOfferingUpdate">;
      const updated: ApiSchema<"CourseOffering"> = {
        ...current,
        ...body,
      };
      if (
        course.status === "discontinued" &&
        (!updated.is_by_request ||
          !isRequiredCourseInDepartment(course.id, course.department_id))
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Discontinued courses may only be offered by request when required by a department curriculum.",
        );
      }
      db.courseOfferings[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/catalog/course_offering/:id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const id = String(params.id);
      const db = getMockDatabase();
      const idx = db.courseOfferings.findIndex((o) => o.id === id);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "Course offering not found.");
      const course = db.courses.find(
        (item) => item.id === db.courseOfferings[idx]?.course_id,
      );
      if (!course) return errorJson(404, "NOT_FOUND", "Course not found.");
      if (!canAccessDepartment(auth.persona, course.department_id)) {
        return errorJson(
          403,
          "FORBIDDEN",
          "Course offering is outside the authorized department.",
        );
      }
      if (courseOfferingHasHistory(id)) {
        return errorJson(
          409,
          "CONFLICT",
          "Academic history or dependent advising records protect this course offering.",
        );
      }
      db.courseOfferings.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post(
    "*/functions/v1/school-terms/:school_term_id/close-encoding",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const { persona } = auth;
      const schoolTermId = String(params.school_term_id);
      const db = getMockDatabase();
      const idx = db.schoolTerms.findIndex((t) => t.id === schoolTermId);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "School term not found.");

      const body = (await request.json().catch(() => ({
        scope: "department",
      }))) as ApiSchema<"SchoolTermCloseEncodingRequest">;
      if (body.scope === "institution" && !persona.roles.includes("admin")) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Institution-wide term encoding closure is restricted to System Admin.",
        );
      }

      const targetDeptId =
        body.department_id ?? persona.departmentId ?? MOCK_IDS.deptDcst;
      if (
        (body.scope ?? "department") === "department" &&
        persona.roles.includes("admin") &&
        !body.department_id
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "department_id is required for an admin department closure.",
        );
      }
      if (
        (body.scope ?? "department") === "department" &&
        !persona.roles.includes("admin") &&
        targetDeptId !== persona.departmentId
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot close encoding for another department.",
        );
      }

      const closure: ApiSchema<"DepartmentTermEncodingClosure"> = {
        id: MOCK_IDS.deptEncodingDcstOpen,
        school_term_id: schoolTermId,
        department_id: targetDeptId,
        is_closed: true,
        closed_by: persona.profileId,
        closed_at: "2026-11-10T09:00:00Z",
        closure_note: body.closure_note ?? "Department grade encoding closed.",
      };
      if ((body.scope ?? "department") === "department") {
        const closureIndex = db.departmentTermEncodings.findIndex(
          (c) =>
            c.school_term_id === schoolTermId &&
            c.department_id === targetDeptId,
        );
        if (closureIndex < 0) db.departmentTermEncodings.push(closure);
        else
          db.departmentTermEncodings[closureIndex] = {
            ...closure,
            id: db.departmentTermEncodings[closureIndex]!.id,
          };
      }

      const updated: ApiSchema<"SchoolTerm"> = {
        ...db.schoolTerms[idx]!,
        ...(body.scope === "institution"
          ? {
              is_locked: true,
              closed_by: persona.profileId,
              closed_at: "2026-11-10T09:00:00Z",
              closure_note: body.closure_note ?? null,
            }
          : {}),
        department_closures: [closure],
      };
      db.schoolTerms[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/school-terms/:school_term_id/reopen-encoding",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"SchoolTermCloseEncodingRequest">;
      if (body.scope === "institution")
        return errorJson(
          400,
          "INVALID_INPUT",
          "Only department closures can be reopened here.",
        );
      const isAdmin = auth.persona.roles.includes("admin");
      if (isAdmin && !body.department_id)
        return errorJson(400, "INVALID_INPUT", "department_id is required.");
      const departmentId = body.department_id ?? auth.persona.departmentId;
      if (!isAdmin && departmentId !== auth.persona.departmentId)
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot reopen another department.",
        );
      const db = getMockDatabase();
      const index = db.departmentTermEncodings.findIndex(
        (c) =>
          c.school_term_id === String(params.school_term_id) &&
          c.department_id === departmentId,
      );
      if (index < 0)
        return errorJson(404, "NOT_FOUND", "Department closure not found.");
      const updated = {
        ...db.departmentTermEncodings[index]!,
        is_closed: false,
      };
      db.departmentTermEncodings[index] = updated;
      return HttpResponse.json(updated);
    },
  ),

  http.put(
    "*/functions/v1/school-terms/:school_term_id/override",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin"]);
      if ("response" in auth) return auth.response;
      const schoolTermId = String(params.school_term_id);
      const db = getMockDatabase();
      const idx = db.schoolTerms.findIndex((t) => t.id === schoolTermId);
      if (idx === -1)
        return errorJson(404, "NOT_FOUND", "School term not found.");
      const body = (await request.json().catch(() => ({
        enabled: false,
      }))) as ApiSchema<"SchoolTermOverrideRequest">;
      const updated: ApiSchema<"SchoolTerm"> = {
        ...db.schoolTerms[idx]!,
        override_flag: Boolean(body.enabled),
        override_actor_id: auth.persona.profileId,
        override_at: "2026-11-10T09:00:00Z",
      };
      db.schoolTerms[idx] = updated;
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  // ===========================================================================
  // 5. Student Roster, Academic Views & Advising Edge Functions
  // ===========================================================================
  http.get("*/functions/v1/students", ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "dean",
      "department_head",
      "department_staff",
      "adviser",
    ]);
    if ("response" in auth) return auth.response;
    const url = new URL(request.url);
    const rawOffset = url.searchParams.get("offset");
    const rawLimit = url.searchParams.get("limit");
    if (
      (rawOffset !== null && !/^\d+$/.test(rawOffset)) ||
      (rawLimit !== null && !/^\d+$/.test(rawLimit))
    )
      return errorJson(400, "INVALID_PAGINATION", "Invalid limit or offset.");
    const pageOffset = rawOffset === null ? 0 : Number(rawOffset);
    const pageLimit = rawLimit === null ? 20 : Number(rawLimit);
    if (
      !Number.isSafeInteger(pageOffset) ||
      pageOffset > 100000 ||
      !Number.isSafeInteger(pageLimit) ||
      pageLimit < 1 ||
      pageLimit > 1000
    )
      return errorJson(400, "INVALID_PAGINATION", "Invalid limit or offset.");
    const scope = url.searchParams.get("assignment_scope") ?? "all";
    const departmentId = url.searchParams.get("department_id");
    const facultyId = url.searchParams.get("faculty_id");
    if (departmentId && !canAccessDepartment(auth.persona, departmentId)) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Not authorized to view this department student roster.",
      );
    }
    if (facultyId && !canAccessFaculty(auth.persona, facultyId)) {
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Not authorized to view this faculty student roster.",
      );
    }

    const db = getMockDatabase();
    const items: ApiSchema<"StudentRosterItem">[] = [];
    for (const org of db.studentOrganizations) {
      const profile = db.profiles.find((p) => p.id === org.student_id);
      const department = db.departments.find((d) => d.id === org.department_id);
      const faculty = db.faculties.find((f) => f.id === org.faculty_id);
      const program = db.programs.find((p) => p.id === org.program_id);
      const curriculum = db.curriculumVersions.find(
        (c) => c.id === org.curriculum_version_id,
      );
      if (!profile || !department || !faculty || !program || !curriculum)
        continue;
      const activeAssignment = db.adviserAssignments.find(
        (a) => a.student_id === org.student_id && a.end_date === null,
      );
      const ownAssignment = db.adviserAssignments.find(
        (a) =>
          a.student_id === org.student_id &&
          a.adviser_id === auth.persona.profileId,
      );
      const visible =
        auth.persona.roles.includes("admin") ||
        (auth.persona.roles.includes("dean") &&
          canAccessFaculty(auth.persona, org.faculty_id)) ||
        (auth.persona.roles.some(
          (role) => role === "department_head" || role === "department_staff",
        ) &&
          canAccessDepartment(auth.persona, org.department_id)) ||
        (auth.persona.roles.includes("adviser") && !!ownAssignment);
      if (!visible) continue;
      const {
        gwa,
        earnedUnits,
        openInc,
        lapsed,
        flags,
        deficiencies,
        standing,
        isDelinquent,
      } = studentMetrics(org.student_id, org.department_id);
      const adviser =
        activeAssignment &&
        db.profiles.find((p) => p.id === activeAssignment.adviser_id);
      items.push({
        student_id: org.student_id,
        student_number: profile.student_number ?? "",
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        status: profile.status,
        faculty_id: faculty.id,
        faculty_name: faculty.name,
        department_id: department.id,
        department_name: department.name,
        program_id: program.id,
        program_code: program.code,
        program_name: program.name,
        curriculum_version_id: curriculum.id,
        curriculum_label: curriculum.version_label,
        entry_year: org.entry_year,
        year_level:
          earnedUnits >= 110
            ? 4
            : earnedUnits >= 72
              ? 3
              : earnedUnits >= 36
                ? 2
                : 1,
        gwa,
        earned_units: earnedUnits,
        required_units: curriculum.total_units,
        standing,
        is_delinquent: isDelinquent,
        deficiencies_count: deficiencyCount(deficiencies),
        open_inc_count: openInc.length,
        lapsed_inc_count: lapsed.length,
        open_flags_count: flags.length,
        nearest_inc_deadline:
          openInc
            .map((row) => row.inc_deadline)
            .filter((date): date is string => !!date)
            .sort()[0] ?? null,
        assignment_status: activeAssignment
          ? "active"
          : ownAssignment
            ? "past"
            : "unassigned",
        adviser_id: activeAssignment?.adviser_id ?? null,
        adviser_name: adviser?.full_name ?? null,
        adviser_assigned_since: activeAssignment?.start_date ?? null,
        handover_label: null,
        last_activity_at: null,
      });
    }
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const programId = url.searchParams.get("program_id");
    const curriculumVersionId = url.searchParams.get("curriculum_version_id");
    const entryYear = url.searchParams.get("entry_year");
    const yearLevel = url.searchParams.get("year_level");
    const adviserId = url.searchParams.get("adviser_id");
    const standing = url.searchParams.get("standing");
    const hasDeficiencies = url.searchParams.get("has_deficiencies");
    const hasOpenInc = url.searchParams.get("has_open_inc");
    const hasOpenFlags = url.searchParams.get("has_open_flags");
    const matchingItems = items.filter((item) => {
      const ownAssignments = db.adviserAssignments.filter(
        (a) =>
          a.student_id === item.student_id &&
          a.adviser_id === auth.persona.profileId,
      );
      const isAdviser = auth.persona.roles.includes("adviser");
      if (
        (scope === "current" || scope === "my_active_advisees") &&
        !(isAdviser
          ? ownAssignments.some((a) => a.end_date === null)
          : item.assignment_status === "active")
      )
        return false;
      if (
        (scope === "past" || scope === "my_handed_over_advisees") &&
        !(isAdviser
          ? ownAssignments.some((a) => a.end_date !== null) &&
            !ownAssignments.some((a) => a.end_date === null)
          : item.assignment_status === "past")
      )
        return false;
      if (scope === "unassigned" && item.assignment_status !== "unassigned")
        return false;
      if (
        url.searchParams.get("unassigned_only") === "true" &&
        item.assignment_status !== "unassigned"
      )
        return false;
      if (departmentId && item.department_id !== departmentId) return false;
      if (facultyId && item.faculty_id !== facultyId) return false;
      if (programId && item.program_id !== programId) return false;
      if (
        curriculumVersionId &&
        item.curriculum_version_id !== curriculumVersionId
      )
        return false;
      if (entryYear !== null && item.entry_year !== Number(entryYear))
        return false;
      if (yearLevel !== null && item.year_level !== Number(yearLevel))
        return false;
      if (adviserId && item.adviser_id !== adviserId) return false;
      if (
        search &&
        !`${item.full_name} ${item.student_number} ${item.email ?? ""}`
          .toLowerCase()
          .includes(search)
      )
        return false;
      if (standing && item.standing !== standing) return false;
      if (
        hasDeficiencies !== null &&
        item.deficiencies_count > 0 !== (hasDeficiencies === "true")
      )
        return false;
      if (
        hasOpenInc !== null &&
        item.open_inc_count > 0 !== (hasOpenInc === "true")
      )
        return false;
      if (
        hasOpenFlags !== null &&
        item.open_flags_count > 0 !== (hasOpenFlags === "true")
      )
        return false;
      return true;
    });
    const offset = pageOffset;
    const limit = pageLimit;
    const countStanding = (
      standing: ApiSchema<"StudentRosterItem">["standing"],
    ) => matchingItems.filter((item) => item.standing === standing).length;

    const sortBy = url.searchParams.get("sort_by") ?? "full_name";
    const sortDirection = url.searchParams.get("sort_dir") === "desc" ? -1 : 1;
    const sorted = [...matchingItems].sort((left, right) => {
      const comparison = (() => {
        switch (sortBy) {
          case "student_number":
            return left.student_number.localeCompare(right.student_number);
          case "year_level":
            return left.year_level - right.year_level;
          case "gwa":
            return (
              (left.gwa ?? Number.POSITIVE_INFINITY) -
              (right.gwa ?? Number.POSITIVE_INFINITY)
            );
          case "units_earned":
            return left.earned_units - right.earned_units;
          case "standing":
            return left.standing.localeCompare(right.standing);
          case "last_activity_at":
            return (left.last_activity_at ?? "").localeCompare(
              right.last_activity_at ?? "",
            );
          default:
            return left.full_name.localeCompare(right.full_name);
        }
      })();
      return comparison * sortDirection;
    });
    const response: ApiSchema<"StudentRosterResponse"> = {
      total_count: matchingItems.length,
      unassigned_count: matchingItems.filter(
        (i) => i.assignment_status === "unassigned",
      ).length,
      with_deficiencies_count: matchingItems.filter(
        (i) => i.deficiencies_count > 0,
      ).length,
      flagged_count: matchingItems.filter(
        (i) => i.open_flags_count > 0 || i.is_delinquent,
      ).length,
      open_inc_students_count: matchingItems.filter((i) => i.open_inc_count > 0)
        .length,
      standing_counts: {
        good_standing: countStanding("good_standing"),
        warning: countStanding("warning"),
        probation: countStanding("probation"),
        dismissed: countStanding("dismissed"),
      },
      items: sorted.slice(offset, offset + limit),
    };
    return HttpResponse.json(response, { status: 200 });
  }),

  http.get(
    "*/functions/v1/students/:student_id/academic-summary",
    ({ request, params }) => {
      const auth = authenticateRequest(request);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId, true)) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Not authorized to view this student academic summary.",
        );
      }
      const db = getMockDatabase();
      const organization = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      if (!organization)
        return errorJson(
          404,
          "NOT_FOUND",
          "Student academic record not found.",
        );
      const curriculum = db.curriculumVersions.find(
        (item) => item.id === organization.curriculum_version_id,
      )!;
      const metrics = studentMetrics(studentId, organization.department_id);
      const inProgress = metrics.results.filter(
        (item) => item.recorded_status === "currently_enrolled",
      );
      const termIds = db.curriculumTerms
        .filter((term) => term.curriculum_version_id === curriculum.id)
        .map((term) => term.id);
      const slots = db.curriculumTermCourses.filter((slot) =>
        termIds.includes(slot.curriculum_term_id),
      );
      const passedSlots = new Set(
        slots
          .filter((slot) =>
            metrics.results.some(
              (item) =>
                item.effective_status === "passed" &&
                (item.curriculum_term_course_id === slot.id ||
                  (slot.course_id != null &&
                    db.courseOfferings.some(
                      (offering) =>
                        offering.id === item.course_offering_id &&
                        offering.course_id === slot.course_id,
                    ))),
            ),
          )
          .map((slot) => slot.id),
      );
      for (const credit of db.outsideCredits.filter(
        (item) => item.student_id === studentId && item.revoked_at == null,
      ))
        passedSlots.add(credit.destination_curriculum_term_course_id);
      const summary: ApiSchema<"AcademicSummary"> = {
        student_id: studentId,
        gwa: metrics.gwa,
        earned_units: metrics.earnedUnits,
        required_units: curriculum.total_units,
        counted_units: metrics.countedUnits + metrics.outsideCreditUnits,
        failed_units: metrics.failedUnits,
        in_progress_units: inProgress.reduce(
          (sum, item) => sum + item.units_attempted,
          0,
        ),
        remaining_units: Math.max(
          0,
          curriculum.total_units - metrics.earnedUnits,
        ),
        failure_pct: metrics.failurePct,
        standing: metrics.standing,
        year_level:
          metrics.earnedUnits >= 110
            ? 4
            : metrics.earnedUnits >= 72
              ? 3
              : metrics.earnedUnits >= 36
                ? 2
                : 1,
        slots_satisfied: slots.filter((slot) => passedSlots.has(slot.id))
          .length,
        total_slots: slots.length,
        open_inc_count: metrics.openInc.length,
        lapsed_inc_count: metrics.lapsed.length,
        open_flags_count: metrics.flags.length,
        deficiencies_count: deficiencyCount(metrics.deficiencies),
        deficiencies: studentDeficiencies(metrics),
        is_delinquent: metrics.isDelinquent,
        computed_at: "2026-11-10T08:00:00Z",
      };
      return HttpResponse.json(summary);
    },
  ),

  http.get(
    "*/functions/v1/students/:student_id/checklist",
    ({ request, params }) => {
      const auth = authenticateRequest(request);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId, true)) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Not authorized to view this student checklist.",
        );
      }
      const db = getMockDatabase();
      const organization = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      if (!organization) return HttpResponse.json([]);
      const termIds = db.curriculumTerms
        .filter(
          (term) =>
            term.curriculum_version_id === organization.curriculum_version_id,
        )
        .map((term) => term.id);
      const slots: ApiSchema<"ChecklistSlotResult">[] = db.curriculumTermCourses
        .filter((slot) => termIds.includes(slot.curriculum_term_id))
        .map((slot) => {
          const matching = db.attemptResults
            .filter(
              (item) =>
                item.student_id === studentId &&
                (item.curriculum_term_course_id === slot.id ||
                  (slot.course_id != null &&
                    db.courseOfferings.some(
                      (offering) =>
                        offering.id === item.course_offering_id &&
                        offering.course_id === slot.course_id,
                    ))),
            )
            .sort((a, b) => {
              const order = (item: ApiSchema<"AttemptResult">) =>
                db.schoolTerms.find(
                  (term) =>
                    term.id ===
                    db.courseOfferings.find(
                      (offering) => offering.id === item.course_offering_id,
                    )?.school_term_id,
                )?.chronological_key ?? 0;
              return (
                order(a) - order(b) ||
                (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
                a.id.localeCompare(b.id)
              );
            });
          const attempt =
            matching.find((item) => item.effective_status === "passed") ??
            matching.at(-1);
          const attempts = matching.flatMap((item) => {
            const offering = db.courseOfferings.find(
              (row) => row.id === item.course_offering_id,
            );
            const term = db.schoolTerms.find(
              (row) => row.id === offering?.school_term_id,
            );
            return term
              ? [
                  {
                    attempt_id: item.id,
                    school_term_id: term.id,
                    term_label: `${term.term_type} ${term.school_year}`,
                    recorded_status: item.recorded_status,
                    effective_status: item.effective_status,
                    midterm_status: item.midterm_status,
                    midterm_grade: item.midterm_grade,
                    final_grade: item.final_grade,
                    completion_grade: item.completion_grade,
                    inc_deadline: item.inc_deadline,
                    instructor: item.instructor,
                  },
                ]
              : [];
          });
          const credit = db.outsideCredits.find(
            (item) =>
              item.student_id === studentId &&
              item.destination_curriculum_term_course_id === slot.id &&
              item.revoked_at == null,
          );
          return {
            curriculum_term_course_id: slot.id,
            status: credit
              ? "passed"
              : (attempt?.effective_status ?? "not_taken"),
            required_units: slot.nominal_units,
            earned_units: credit
              ? credit.units_credited
              : attempt?.effective_status === "passed"
                ? attempt.units_attempted
                : 0,
            source_attempt_id: credit ? null : (attempt?.id ?? null),
            satisfaction_source: credit
              ? "Outside credit"
              : attempt?.effective_status === "passed"
                ? "Direct"
                : null,
            credited_course_code: credit?.original_course_code ?? null,
            credited_course_title: credit?.original_course_title ?? null,
            attempts,
            grade_fix_history: matching.flatMap(
              (item) => item.grade_fix_history ?? [],
            ),
          };
        });
      return HttpResponse.json(slots);
    },
  ),

  http.get(
    "*/functions/v1/students/:student_id/grades",
    ({ request, params }) => {
      const auth = authenticateRequest(request);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId, true)) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Not authorized to view this student grades.",
        );
      }
      const db = getMockDatabase();
      const studentAttempts = markRetakeResults(
        db.attemptResults.filter((a) => a.student_id === studentId),
      );
      const termGrades: ApiSchema<"TermGrades">[] = db.schoolTerms
        .flatMap((term) => {
          const attempts = studentAttempts.filter((a) =>
            db.courseOfferings.some(
              (o) =>
                o.id === a.course_offering_id && o.school_term_id === term.id,
            ),
          );
          if (!attempts.length) return [];
          const graded = attempts
            .map((a) => ({
              grade:
                a.completion_grade ??
                a.final_grade ??
                (a.is_lapsed_inc ? 5 : null),
              units: a.units_attempted,
            }))
            .filter((a) => a.grade != null && a.units > 0);
          const units = graded.reduce((sum, item) => sum + item.units, 0);
          return [
            {
              school_term_id: term.id,
              school_year: term.school_year,
              term_type: term.term_type,
              chronological_key: term.chronological_key,
              gwa: units
                ? graded.reduce(
                    (sum, item) => sum + item.grade! * item.units,
                    0,
                  ) / units
                : null,
              attempts,
            },
          ];
        })
        .sort((a, b) => b.chronological_key - a.chronological_key);
      return HttpResponse.json(termGrades, { status: 200 });
    },
  ),

  http.get(
    "*/functions/v1/students/:student_id/course-offerings",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId, true)) {
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      }
      const db = getMockDatabase();
      const url = new URL(request.url);
      const query = url.searchParams;
      const rawOffset = query.get("offset");
      const rawLimit = query.get("limit");
      if (
        (rawOffset !== null && !/^\d+$/.test(rawOffset)) ||
        (rawLimit !== null && !/^\d+$/.test(rawLimit))
      )
        return errorJson(400, "INVALID_PAGINATION", "Invalid limit or offset.");
      const pageOffset = rawOffset === null ? 0 : Number(rawOffset);
      const pageLimit = rawLimit === null ? 100 : Number(rawLimit);
      if (
        !Number.isSafeInteger(pageOffset) ||
        pageOffset > 100000 ||
        !Number.isSafeInteger(pageLimit) ||
        pageLimit < 1 ||
        pageLimit > 1000
      )
        return errorJson(400, "INVALID_PAGINATION", "Invalid limit or offset.");
      const schoolTermId = query.get("school_term_id");
      const search = query.get("search")?.trim().toLowerCase();
      const organization = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      if (!organization)
        return errorJson(
          404,
          "NOT_FOUND",
          "Student academic record not found.",
        );
      const terms = db.curriculumTerms.filter(
        (item) =>
          item.curriculum_version_id === organization.curriculum_version_id,
      );
      const slots = db.curriculumTermCourses.filter((item) =>
        terms.some((term) => term.id === item.curriculum_term_id),
      );
      const results = db.attemptResults.filter(
        (item) => item.student_id === studentId,
      );
      const options: ApiSchema<"CourseOfferingOption">[] =
        db.courseOfferings.flatMap((offering) => {
          if (schoolTermId && offering.school_term_id !== schoolTermId)
            return [];
          const course = db.courses.find(
            (item) => item.id === offering.course_id,
          );
          if (
            !course ||
            (search &&
              !`${course.code} ${course.title}`.toLowerCase().includes(search))
          )
            return [];
          const slot = slots.find((item) => item.course_id === course.id);
          const unmet: ApiSchema<"UnmetPrerequisitePreview">[] =
            db.prerequisites
              .filter(
                (item) =>
                  item.course_id === course.id && item.type === "strict",
              )
              .flatMap((prerequisite) => {
                const requiredCourse = db.courses.find(
                  (item) => item.id === prerequisite.prerequisite_course_id,
                );
                if (!requiredCourse) return [];
                const requiredAttempts = results.filter((item) =>
                  db.courseOfferings.some(
                    (row) =>
                      row.id === item.course_offering_id &&
                      row.course_id === requiredCourse.id,
                  ),
                );
                const requiredSlots = slots.filter(
                  (item) => item.course_id === requiredCourse.id,
                );
                if (
                  requiredAttempts.some(
                    (item) => item.effective_status === "passed",
                  ) ||
                  db.outsideCredits.some(
                    (item) =>
                      item.student_id === studentId &&
                      item.revoked_at === null &&
                      requiredSlots.some(
                        (slotRow) =>
                          slotRow.id ===
                          item.destination_curriculum_term_course_id,
                      ),
                  )
                )
                  return [];
                const latest = requiredAttempts
                  .sort((left, right) => {
                    const termOrder = (attempt: ApiSchema<"AttemptResult">) => {
                      const offering = db.courseOfferings.find(
                        (row) => row.id === attempt.course_offering_id,
                      );
                      return (
                        db.schoolTerms.find(
                          (term) => term.id === offering?.school_term_id,
                        )?.chronological_key ?? 0
                      );
                    };
                    return (
                      termOrder(left) - termOrder(right) ||
                      left.created_at.localeCompare(right.created_at) ||
                      left.id.localeCompare(right.id)
                    );
                  })
                  .at(-1);
                const state = latest?.is_lapsed_inc
                  ? "lapsed_inc"
                  : latest?.effective_status === "passed" ||
                      latest?.effective_status === "na"
                    ? "not_taken"
                    : (latest?.effective_status ?? "not_taken");
                return [
                  {
                    prerequisite_course_id: requiredCourse.id,
                    code: requiredCourse.code,
                    title: requiredCourse.title,
                    type: prerequisite.type,
                    current_status: state,
                    latest_attempt_id: latest?.id ?? null,
                    latest_final_grade: latest?.final_grade ?? null,
                  },
                ];
              });
          return [
            {
              offering,
              code: course.code,
              title: course.title,
              units: course.units,
              group: slot ? "program" : "cross_program",
              direct_curriculum_slot_id: slot?.id ?? null,
              instructor_options: offering.instructor
                ? [offering.instructor]
                : [],
              has_unmet_strict_prerequisites: unmet.length > 0,
              unmet_prerequisites: unmet,
            },
          ];
        });
      options.sort(
        (a, b) =>
          Number(a.group === "cross_program") -
            Number(b.group === "cross_program") || a.code.localeCompare(b.code),
      );
      return HttpResponse.json(
        options.slice(pageOffset, pageOffset + Math.min(100, pageLimit)),
        {
          status: 200,
        },
      );
    },
  ),

  http.get(
    "*/functions/v1/students/:student_id/recommendations",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId, true)) {
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      }
      {
        const db = getMockDatabase();
        const organization = db.studentOrganizations.find(
          (item) => item.student_id === studentId,
        );
        if (!organization)
          return errorJson(
            404,
            "NOT_FOUND",
            "Student academic record not found.",
          );
        const selectedTerm = new URL(request.url).searchParams.get(
          "school_term_id",
        );
        const terms = db.curriculumTerms.filter(
          (item) =>
            item.curriculum_version_id === organization.curriculum_version_id,
        );
        const slots = db.curriculumTermCourses.filter((item) =>
          terms.some((term) => term.id === item.curriculum_term_id),
        );
        const results = db.attemptResults.filter(
          (item) => item.student_id === studentId,
        );
        const orderedTerms = [...terms].sort(
          (left, right) =>
            left.year_level - right.year_level ||
            left.term_sequence - right.term_sequence,
        );
        const previousTermIndices = results.flatMap((result) => {
          const slot = slots.find(
            (item) =>
              item.id === result.curriculum_term_course_id ||
              (item.course_id != null &&
                db.courseOfferings.some(
                  (offering) =>
                    offering.id === result.course_offering_id &&
                    offering.course_id === item.course_id,
                )),
          );
          const index = orderedTerms.findIndex(
            (term) => term.id === slot?.curriculum_term_id,
          );
          return index < 0 ? [] : [index];
        });
        const horizonIndex = previousTermIndices.length
          ? Math.min(
              Math.max(...previousTermIndices) + 1,
              orderedTerms.length - 1,
            )
          : 0;
        let excluded = 0;
        const recommendations: ApiSchema<"Recommendation">[] = [];
        for (const slot of slots) {
          const curriculumTerm = terms.find(
            (item) => item.id === slot.curriculum_term_id,
          )!;
          if (
            orderedTerms.indexOf(curriculumTerm) > horizonIndex ||
            !slot.course_id
          )
            continue;
          const course = db.courses.find((item) => item.id === slot.course_id);
          if (!course) continue;
          const prior = results.filter(
            (item) =>
              item.curriculum_term_course_id === slot.id ||
              db.courseOfferings.some(
                (offering) =>
                  offering.id === item.course_offering_id &&
                  offering.course_id === course.id,
              ),
          );
          const credited = db.outsideCredits.some(
            (item) =>
              item.student_id === studentId &&
              item.destination_curriculum_term_course_id === slot.id &&
              item.revoked_at === null,
          );
          if (
            credited ||
            prior.some(
              (item) =>
                item.effective_status === "passed" ||
                item.effective_status === "currently_enrolled" ||
                (item.effective_status === "inc" && !item.is_lapsed_inc),
            )
          ) {
            excluded++;
            continue;
          }
          const eligible = db.prerequisites
            .filter(
              (item) => item.course_id === course.id && item.type === "strict",
            )
            .every((prerequisite) => {
              const requiredSlot = slots.find(
                (item) =>
                  item.course_id === prerequisite.prerequisite_course_id,
              );
              return (
                results.some(
                  (item) =>
                    item.effective_status === "passed" &&
                    (item.curriculum_term_course_id === requiredSlot?.id ||
                      db.courseOfferings.some(
                        (offering) =>
                          offering.id === item.course_offering_id &&
                          offering.course_id ===
                            prerequisite.prerequisite_course_id,
                      )),
                ) ||
                db.outsideCredits.some(
                  (item) =>
                    item.student_id === studentId &&
                    item.destination_curriculum_term_course_id ===
                      requiredSlot?.id &&
                    item.revoked_at === null,
                )
              );
            });
          if (!eligible) continue;
          const offering = db.courseOfferings.find(
            (item) =>
              item.course_id === course.id &&
              (!selectedTerm || item.school_term_id === selectedTerm) &&
              !prior.some((attempt) => attempt.course_offering_id === item.id),
          );
          if (!offering) {
            excluded++;
            continue;
          }
          const badges: ApiSchema<"Recommendation">["badges"] = [];
          if (
            prior.some(
              (item) =>
                item.effective_status === "failed" || item.is_lapsed_inc,
            )
          )
            badges.push("Retake");
          if (offering.is_by_request) badges.push("By request");
          recommendations.push({
            course_offering_id: offering.id,
            curriculum_term_course_id: slot.id,
            code: course.code,
            title: course.title,
            units: course.units,
            why: "Offered in the selected term and satisfies an unfinished curriculum requirement.",
            badges,
          });
        }
        return HttpResponse.json(recommendations, {
          headers: { "X-Excluded-Count": String(excluded) },
        });
      }
    },
  ),

  // ===========================================================================
  // 6. Grade Recording, Encoding, Corrections, INC & Flags
  // ===========================================================================
  http.post(
    "*/functions/v1/students/:student_id/record-grades",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!isCurrentAdviser(auth.persona, studentId)) {
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      }
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"RecordGradesRequest"> | null;
      if (!body?.school_term_id || !body?.course_offering_id) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "school_term_id and course_offering_id are required.",
        );
      }
      if (departmentEncodingClosed(studentId, body.school_term_id))
        return encodingClosedResponse();
      const db = getMockDatabase();
      const existing = db.attemptResults.find(
        (a) =>
          a.student_id === studentId &&
          a.course_offering_id === body.course_offering_id,
      );
      if (existing && body.final_grade != null && existing.final_grade != null)
        return errorJson(
          409,
          "GRADE_ALREADY_RECORDED",
          "Use grade correction for an existing final grade.",
        );
      if (existing?.effective_status === "passed")
        return errorJson(
          409,
          "COURSE_ALREADY_PASSED",
          "A passed course cannot be retaken.",
        );
      if (!existing && alreadyPassedCourse(studentId, body.course_offering_id))
        return errorJson(
          409,
          "COURSE_ALREADY_PASSED",
          "A passed course cannot be retaken.",
        );
      if (
        !existing &&
        body.midterm_grade !== undefined &&
        body.midterm_grade !== null &&
        !body.confirmed_enrollment
      ) {
        return errorJson(
          409,
          "ENROLLMENT_CONFIRMATION_REQUIRED",
          "Confirm new course enrollment before recording a midterm grade.",
          "No existing attempt found for the selected course offering.",
          "Re-submit with confirmed_enrollment=true.",
        );
      }

      const recordedStatus: ApiSchema<"AttemptStatus"> =
        body.midterm_status === "dr"
          ? "dr"
          : body.status
            ? body.status
            : body.final_grade !== undefined && body.final_grade !== null
              ? body.final_grade <= 3.0
                ? "passed"
                : "failed"
              : "currently_enrolled";

      const result: ApiSchema<"AttemptResult"> = {
        id: existing?.id ?? nextSyntheticUuid(),
        student_id: studentId,
        course_offering_id: body.course_offering_id,
        curriculum_term_course_id:
          body.curriculum_term_course_id ?? MOCK_IDS.slotCsci153,
        recorded_status: recordedStatus,
        midterm_status: body.midterm_status ?? "graded",
        midterm_grade: body.midterm_grade ?? existing?.midterm_grade ?? null,
        final_grade:
          body.midterm_status === "dr"
            ? null
            : (body.final_grade ?? existing?.final_grade ?? null),
        inc_deadline: recordedStatus === "inc" ? "2027-12-18" : null,
        instructor: body.instructor ?? "Dr. Jose Rizalino Gomez",
        prerequisite_override: Boolean(
          body.continue_with_prerequisite_override,
        ),
        prerequisite_grade_override: false,
        grade_fix_history: [],
        units_attempted: 3,
        revision: 1,
        created_at: existing?.created_at ?? "2026-11-10T09:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
        completion_grade: null,
        resolved_at: null,
        effective_status: recordedStatus,
        gwa_grade: body.final_grade ?? null,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: false,
      };
      if (existing)
        db.attemptResults[db.attemptResults.indexOf(existing)] = result;
      else db.attemptResults.push(result);
      return HttpResponse.json(markRetakeResults([result])[0], { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/encode-grades",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!isCurrentAdviser(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"EncodeTermGradesRequest"> | null;
      if (!body?.school_term_id || !Array.isArray(body.rows)) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "school_term_id and rows are required.",
        );
      }
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      if (departmentEncodingClosed(studentId, body.school_term_id))
        return encodingClosedResponse();
      const db = getMockDatabase();
      const existing = body.rows.map((row) =>
        db.attemptResults.find(
          (a) =>
            a.student_id === studentId &&
            a.course_offering_id === row.course_offering_id,
        ),
      );
      if (
        new Set(body.rows.map((row) => row.course_offering_id)).size !==
        body.rows.length
      )
        return errorJson(
          409,
          "DUPLICATE_OFFERING",
          "Each course offering may appear once.",
        );
      if (
        body.rows.some(
          (row, index) =>
            row.attempt_id && row.attempt_id !== existing[index]?.id,
        )
      )
        return errorJson(
          404,
          "NOT_FOUND",
          "The selected attempt was not found.",
        );
      if (
        body.rows.some(
          (row, index) =>
            !existing[index] &&
            alreadyPassedCourse(studentId, row.course_offering_id),
        )
      )
        return errorJson(
          409,
          "COURSE_ALREADY_PASSED",
          "A passed course cannot be retaken.",
        );
      if (
        body.rows.some(
          (row, index) =>
            existing[index]?.final_grade != null &&
            row.final_grade != null &&
            existing[index]?.final_grade !== row.final_grade,
        )
      )
        return errorJson(
          409,
          "GRADE_ALREADY_RECORDED",
          "Use grade correction for an existing final grade.",
        );
      const results: ApiSchema<"AttemptResult">[] = body.rows.map(
        (row, index) => {
          const old = existing[index];
          const final = row.final_grade ?? old?.final_grade ?? null;
          const status =
            row.status ??
            (final == null
              ? (old?.recorded_status ?? "currently_enrolled")
              : final <= 3
                ? "passed"
                : "failed");
          const offering = db.courseOfferings.find(
            (o) => o.id === row.course_offering_id,
          );
          const course = db.courses.find((c) => c.id === offering?.course_id);
          return {
            id: old?.id ?? nextSyntheticUuid(),
            student_id: studentId,
            course_offering_id: row.course_offering_id,
            curriculum_term_course_id:
              row.curriculum_term_course_id ??
              old?.curriculum_term_course_id ??
              null,
            recorded_status: status,
            midterm_status:
              row.midterm_status ?? old?.midterm_status ?? "graded",
            midterm_grade: row.midterm_grade ?? old?.midterm_grade ?? null,
            final_grade: final,
            inc_deadline: old?.inc_deadline ?? null,
            instructor: row.instructor ?? old?.instructor ?? null,
            prerequisite_override: Boolean(
              row.continue_with_prerequisite_override ??
              old?.prerequisite_override,
            ),
            prerequisite_grade_override:
              old?.prerequisite_grade_override ?? false,
            grade_fix_history: old?.grade_fix_history ?? [],
            units_attempted: old?.units_attempted ?? course?.units ?? 0,
            revision: (old?.revision ?? 0) + 1,
            created_at: old?.created_at ?? "2026-11-10T09:00:00Z",
            updated_at: "2026-11-10T09:00:00Z",
            completion_grade: old?.completion_grade ?? null,
            resolved_at: old?.resolved_at ?? null,
            effective_status: status,
            gwa_grade: final,
            is_lapsed_inc: old?.is_lapsed_inc ?? false,
            is_repeated: false,
            counts_toward_cumulative_gwa: false,
          };
        },
      );
      results.forEach((result, index) => {
        const old = existing[index];
        if (old) db.attemptResults[db.attemptResults.indexOf(old)] = result;
        else db.attemptResults.push(result);
      });
      return HttpResponse.json(markRetakeResults(results), { status: 200 });
    },
  ),

  http.patch(
    "*/functions/v1/students/:student_id/attempts/:attempt_id/grades",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const attemptId = String(params.attempt_id);
      const db = getMockDatabase();
      if (
        !db.adviserAssignments.some(
          (a) =>
            a.student_id === studentId &&
            a.adviser_id === auth.persona.profileId &&
            a.end_date == null,
        )
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser may correct grades.",
        );
      }
      const attempt = db.attemptResults.find(
        (a) => a.id === attemptId && a.student_id === studentId,
      );
      if (!attempt)
        return errorJson(
          404,
          "NOT_FOUND",
          "Attempt not found for this student.",
        );
      const offering = db.courseOfferings.find(
        (o) => o.id === attempt.course_offering_id,
      );
      const term = db.schoolTerms.find(
        (t) => t.id === offering?.school_term_id,
      );
      if (!term) return errorJson(404, "NOT_FOUND", "School term not found.");
      if (attemptEncodingClosed(studentId, attemptId))
        return encodingClosedResponse();
      if (term.is_locked && !term.override_flag)
        return errorJson(
          409,
          "TERM_LOCKED",
          "Corrections require an editable term.",
        );
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const allowed = [
        "expected_revision",
        "status",
        "midterm_status",
        "midterm_grade",
        "final_grade",
        "instructor",
        "reason",
      ];
      const changed = [
        "status",
        "midterm_status",
        "midterm_grade",
        "final_grade",
        "instructor",
      ];
      const validGrade = (value: unknown) =>
        value === null ||
        (typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 1 &&
          value <= 5 &&
          (value * 4) % 1 === 0);
      if (
        !body ||
        Object.keys(body).some((key) => !allowed.includes(key)) ||
        !changed.some((key) => key in body) ||
        !Number.isInteger(body.expected_revision) ||
        (body.expected_revision as number) < 0 ||
        typeof body.reason !== "string" ||
        !body.reason.trim() ||
        body.reason.length > 2000 ||
        ("final_grade" in body && !validGrade(body.final_grade)) ||
        ("midterm_grade" in body && !validGrade(body.midterm_grade)) ||
        ("status" in body &&
          ![
            "passed",
            "failed",
            "currently_enrolled",
            "inc",
            "dr",
            "na",
          ].includes(String(body.status))) ||
        ("midterm_status" in body &&
          body.midterm_status !== null &&
          !["graded", "dr"].includes(String(body.midterm_status))) ||
        ("instructor" in body &&
          body.instructor !== null &&
          (typeof body.instructor !== "string" || body.instructor.length > 150))
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Provide valid correction fields, revision and reason.",
        );
      }
      const currentAttempt = db.attemptResults.find(
        (a) => a.id === attemptId && a.student_id === studentId,
      );
      if (!currentAttempt)
        return errorJson(
          404,
          "NOT_FOUND",
          "Attempt not found for this student.",
        );
      if (body.expected_revision !== currentAttempt.revision)
        return errorJson(
          409,
          "STALE_ATTEMPT",
          "The attempt changed since it was loaded.",
        );
      if (currentAttempt.completion_grade != null)
        return errorJson(
          409,
          "INC_COMPLETION_EXISTS",
          "Use the INC completion correction operation.",
        );
      if (currentAttempt.recorded_status === "inc" && body.final_grade != null)
        return errorJson(
          409,
          "INC_COMPLETION_REQUIRED",
          "Use the INC completion operation for an incomplete grade.",
        );
      if (
        !currentAttempt.prerequisite_override &&
        ("final_grade" in body || "status" in body)
      ) {
        const required = db.prerequisites.filter(
          (p) => p.course_id === offering?.course_id && p.type === "strict",
        );
        const unmet = required.some((prerequisite) => {
          const slots = db.curriculumTermCourses
            .filter((s) => s.course_id === prerequisite.prerequisite_course_id)
            .map((s) => s.id);
          const passed = (candidate: ApiSchema<"AttemptResult">) => {
            const priorOffering = db.courseOfferings.find(
              (o) => o.id === candidate.course_offering_id,
            );
            const priorTerm = db.schoolTerms.find(
              (t) => t.id === priorOffering?.school_term_id,
            );
            return (
              candidate.student_id === studentId &&
              candidate.effective_status === "passed" &&
              !!priorTerm &&
              priorTerm.chronological_key < term.chronological_key
            );
          };
          const direct = db.attemptResults.some(
            (a) =>
              passed(a) &&
              db.courseOfferings.some(
                (o) =>
                  o.id === a.course_offering_id &&
                  o.course_id === prerequisite.prerequisite_course_id,
              ),
          );
          const credit = db.outsideCredits.some(
            (c) =>
              c.student_id === studentId &&
              c.revoked_at == null &&
              slots.includes(c.destination_curriculum_term_course_id) &&
              c.decided_at.slice(0, 10) <= term.ends_on,
          );
          const equivalent = db.equivalencyDecisions.some(
            (d) =>
              d.student_id === studentId &&
              d.revoked_at == null &&
              slots.includes(d.destination_curriculum_term_course_id) &&
              d.decided_at.slice(0, 10) <= term.ends_on &&
              db.attemptResults.some((a) => a.id === d.attempt_id && passed(a)),
          );
          return !direct && !credit && !equivalent;
        });
        if (unmet)
          return errorJson(
            409,
            "PREREQUISITE_NOT_MET",
            "A strict prerequisite is not satisfied and this attempt has no override.",
          );
      }
      let finalGrade = (
        "final_grade" in body ? body.final_grade : currentAttempt.final_grade
      ) as number | null;
      const midtermGrade = (
        "midterm_grade" in body
          ? body.midterm_grade
          : currentAttempt.midterm_grade
      ) as number | null;
      const midtermStatus = (
        "midterm_status" in body
          ? body.midterm_status
          : currentAttempt.midterm_status
      ) as ApiSchema<"MidtermStatus"> | null | undefined;
      let status = (
        "status" in body ? body.status : currentAttempt.recorded_status
      ) as ApiSchema<"AttemptStatus">;
      if (
        currentAttempt.midterm_status === "dr" &&
        midtermStatus !== "dr" &&
        !("status" in body)
      )
        status = "currently_enrolled";
      if (midtermStatus === "dr") {
        if (
          body.final_grade != null ||
          (body.status != null && body.status !== "dr")
        )
          return errorJson(
            400,
            "INVALID_INPUT",
            "A dropped midterm requires a dropped final.",
          );
        status = "dr";
        finalGrade = null;
      } else if (status === "dr") {
        return errorJson(
          400,
          "INVALID_INPUT",
          "A dropped final requires a dropped midterm.",
        );
      } else if (finalGrade != null) {
        const derived = finalGrade <= 3 ? "passed" : "failed";
        if ("status" in body && status !== derived)
          return errorJson(
            400,
            "INVALID_INPUT",
            "Status must match the final grade.",
          );
        status = derived;
      } else if (status === "passed" || status === "failed") {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Passed or failed status requires a numeric final grade.",
        );
      }
      if (midtermStatus === "dr" && midtermGrade != null)
        return errorJson(
          400,
          "INVALID_INPUT",
          "A dropped midterm cannot have a numeric grade.",
        );
      const updatedAt = new Date().toISOString();
      const instructor = (
        "instructor" in body ? body.instructor : currentAttempt.instructor
      ) as string | null | undefined;
      const oldValue = {
        status: currentAttempt.recorded_status,
        midterm_status: currentAttempt.midterm_status,
        midterm_grade: currentAttempt.midterm_grade,
        final_grade: currentAttempt.final_grade,
        instructor: currentAttempt.instructor,
      };
      const newValue = {
        status,
        midterm_status: midtermStatus,
        midterm_grade: midtermGrade,
        final_grade: finalGrade,
        instructor,
      };
      const history = [...(currentAttempt.grade_fix_history ?? [])];
      if (currentAttempt.midterm_grade !== midtermGrade)
        history.push({
          changed_at: updatedAt,
          old_grade: currentAttempt.midterm_grade,
          new_grade: midtermGrade,
          actor_name: auth.persona.fullName,
          summary: "Midterm grade corrected",
        });
      if (currentAttempt.final_grade !== finalGrade)
        history.push({
          changed_at: updatedAt,
          old_grade: currentAttempt.final_grade,
          new_grade: finalGrade,
          actor_name: auth.persona.fullName,
          summary: "Final grade corrected",
        });
      const incDeadline =
        status === "inc"
          ? (currentAttempt.inc_deadline ?? term.default_inc_deadline)
          : null;
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const lapsed = status === "inc" && !!incDeadline && incDeadline < today;
      const result: ApiSchema<"AttemptResult"> = {
        ...currentAttempt,
        recorded_status: status,
        effective_status: status,
        midterm_status: midtermStatus,
        midterm_grade: midtermGrade,
        final_grade: finalGrade,
        instructor,
        inc_deadline: incDeadline,
        gwa_grade: finalGrade ?? (lapsed ? 5 : null),
        is_lapsed_inc: lapsed,
        revision: currentAttempt.revision + 1,
        updated_at: updatedAt,
        grade_fix_history: history,
      };
      db.attemptResults[db.attemptResults.indexOf(currentAttempt)] = result;
      const base = db.attempts.find(
        (a) => a.id === attemptId && a.student_id === studentId,
      );
      if (base)
        Object.assign(base, {
          ...newValue,
          inc_deadline: result.inc_deadline,
          revision: result.revision,
          updated_at: updatedAt,
          updated_by: auth.persona.profileId,
        });
      const student = db.profiles.find((p) => p.id === studentId);
      db.auditLogEntries.push({
        id: nextSyntheticUuid(),
        actor_id: auth.persona.profileId,
        actor_name: auth.persona.fullName,
        actor_role: auth.persona.primaryRole,
        student_id: studentId,
        student_name: student?.full_name ?? null,
        student_number: student?.student_number ?? null,
        target_label: student?.full_name ?? "Student grade",
        action: "grade_corrected",
        action_category: "grade_update",
        entity_type: "attempt",
        entity_id: attemptId,
        details_summary: "Corrected course grade or status.",
        old_value: auditSnapshot(oldValue),
        new_value: auditSnapshot(newValue),
        reason: body.reason.trim(),
        created_at: updatedAt,
      });
      return HttpResponse.json(markRetakeResults([result])[0], { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/students/:student_id/attempts/:attempt_id",
    ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const attemptId = String(params.attempt_id);
      if (
        !getMockDatabase().adviserAssignments.some(
          (assignment) =>
            assignment.student_id === studentId &&
            assignment.adviser_id === auth.persona.profileId &&
            assignment.end_date === null,
        )
      )
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      if (
        !getMockDatabase().attemptResults.some(
          (attempt) =>
            attempt.student_id === studentId && attempt.id === attemptId,
        )
      )
        return errorJson(404, "NOT_FOUND", "Course attempt not found.");
      return errorJson(
        409,
        "CONFLICT",
        "Saved course attempts cannot be deleted.",
      );
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/attempts/:attempt_id/prerequisite-grade",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const attemptId = String(params.attempt_id);
      if (attemptEncodingClosed(studentId, attemptId))
        return encodingClosedResponse();
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"PrerequisiteGradeCorrectionRequest">;
      const result: ApiSchema<"AttemptResult"> = {
        id: attemptId,
        student_id: studentId,
        course_offering_id: MOCK_IDS.offeringCsci102,
        curriculum_term_course_id: MOCK_IDS.slotCsci102,
        recorded_status: "passed",
        midterm_status: "graded",
        midterm_grade: 2.0,
        final_grade: body.final_grade ?? 2.25,
        inc_deadline: null,
        instructor: "Prof. Maria Clara Santos",
        prerequisite_override: false,
        prerequisite_grade_override: true,
        grade_fix_history: [],
        units_attempted: 3,
        revision: (body.expected_revision ?? 1) + 1,
        created_at: "2026-05-20T08:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
        completion_grade: null,
        resolved_at: null,
        effective_status: "passed",
        gwa_grade: body.final_grade ?? 2.25,
        is_lapsed_inc: false,
        is_repeated: false,
        counts_toward_cumulative_gwa: false,
      };
      return HttpResponse.json(markRetakeResults([result])[0], { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/attempts/:attempt_id/inc-completion",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const attemptId = String(params.attempt_id);
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"INCCompletionRequest">;
      const db = getMockDatabase();
      const attempt = db.attemptResults.find(
        (a) => a.id === attemptId && a.student_id === studentId,
      );
      if (!attempt) return errorJson(404, "NOT_FOUND", "Attempt not found.");
      if (
        !db.adviserAssignments.some(
          (a) =>
            a.student_id === studentId &&
            a.adviser_id === auth.persona.profileId &&
            a.end_date === null,
        )
      )
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser may change an INC completion.",
        );
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      if (
        attempt.recorded_status !== "inc" ||
        !attempt.inc_deadline ||
        attempt.inc_deadline < today ||
        db.incResolutions.some((r) => r.attempt_id === attemptId)
      ) {
        return errorJson(
          409,
          "INC_NOT_ELIGIBLE",
          "Only an unresolved INC on or before its deadline can be completed.",
        );
      }
      if (
        !body.reason?.trim() ||
        !Number.isFinite(body.completion_grade) ||
        body.completion_grade < 1 ||
        body.completion_grade > 5 ||
        (body.completion_grade * 4) % 1 !== 0
      )
        return errorJson(
          400,
          "INVALID_INPUT",
          "Enter a valid completion grade and reason.",
        );
      const resolution: ApiSchema<"INCResolution"> = {
        id: MOCK_IDS.incResolution1,
        student_id: studentId,
        attempt_id: attemptId,
        completion_grade: body.completion_grade ?? 2.0,
        resolved_by: auth.persona.profileId,
        resolved_at: "2026-11-10T09:00:00Z",
        updated_by: auth.persona.profileId,
        updated_at: "2026-11-10T09:00:00Z",
        effective_status:
          (body.completion_grade ?? 2.0) <= 3.0 ? "passed" : "failed",
      };
      db.incResolutions.push(resolution);
      db.attemptResults[db.attemptResults.indexOf(attempt)] = {
        ...attempt,
        completion_grade: resolution.completion_grade,
        gwa_grade: resolution.completion_grade,
        effective_status: resolution.effective_status,
        resolved_at: resolution.resolved_at,
      };
      return HttpResponse.json(resolution, { status: 201 });
    },
  ),

  http.patch(
    "*/functions/v1/students/:student_id/attempts/:attempt_id/inc-completion",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const attemptId = String(params.attempt_id);
      const rawBody: unknown = await request.json().catch(() => null);
      if (!isIncCompletionCorrectionRequest(rawBody)) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Enter a valid completion grade, reason, and expected_updated_at.",
        );
      }
      const body = rawBody;

      const db = getMockDatabase();
      const attempt = db.attemptResults.find(
        (a) => a.id === attemptId && a.student_id === studentId,
      );
      if (!attempt) return errorJson(404, "NOT_FOUND", "Attempt not found.");
      if (
        !db.adviserAssignments.some(
          (a) =>
            a.student_id === studentId &&
            a.adviser_id === auth.persona.profileId &&
            a.end_date === null,
        )
      )
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser may change an INC completion.",
        );
      const resolution = db.incResolutions.find(
        (r) => r.attempt_id === attemptId,
      );
      if (!resolution)
        return errorJson(404, "NOT_FOUND", "INC completion not found.");
      // A correction is not the first-completion exception: closures and locks both block it.
      if (attemptEncodingClosed(studentId, attemptId))
        return encodingClosedResponse();
      const offering = db.courseOfferings.find(
        (o) => o.id === attempt.course_offering_id,
      );
      const term = db.schoolTerms.find(
        (t) => t.id === offering?.school_term_id,
      );
      if (term?.is_locked && !term.override_flag)
        return errorJson(
          409,
          "TERM_LOCKED",
          "Corrections require an editable term.",
        );
      if (body.expected_updated_at !== resolution.updated_at)
        return errorJson(
          409,
          "STALE_COMPLETION",
          "The INC completion changed since it was loaded.",
        );

      const oldValue = {
        completion_grade: resolution.completion_grade,
        effective_status: resolution.effective_status,
      };
      const updatedAt = new Date().toISOString();
      const corrected: ApiSchema<"INCResolution"> = {
        ...resolution,
        completion_grade: body.completion_grade,
        updated_by: auth.persona.profileId,
        updated_at: updatedAt,
        effective_status: body.completion_grade <= 3.0 ? "passed" : "failed",
      };
      db.incResolutions[db.incResolutions.indexOf(resolution)] = corrected;
      db.attemptResults[db.attemptResults.indexOf(attempt)] = {
        ...attempt,
        completion_grade: corrected.completion_grade,
        gwa_grade: corrected.completion_grade,
        effective_status: corrected.effective_status,
        updated_at: updatedAt,
      };
      const student = db.profiles.find((profile) => profile.id === studentId);
      const auditEntry: ApiSchema<"AuditLogEntry"> = {
        id: nextSyntheticUuid(),
        actor_id: auth.persona.profileId,
        actor_name: auth.persona.fullName,
        actor_role: auth.persona.primaryRole,
        student_id: studentId,
        student_name: student?.full_name ?? null,
        student_number: student?.student_number ?? null,
        target_label: student?.student_number
          ? `${student.student_number} · ${student.full_name}`
          : (student?.full_name ?? "Student INC completion"),
        action: "inc_completion_corrected",
        action_category: "grade_update",
        entity_type: "inc_resolution",
        entity_id: resolution.id,
        details_summary: `Corrected INC completion grade from ${oldValue.completion_grade} to ${corrected.completion_grade}.`,
        old_value: auditSnapshot(oldValue),
        new_value: auditSnapshot({
          completion_grade: corrected.completion_grade,
          effective_status: corrected.effective_status,
        }),
        reason: body.reason,
        created_at: updatedAt,
      };
      db.auditLogEntries.push(auditEntry);
      return HttpResponse.json(corrected, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/grade-flags",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["student", "admin"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (
        !auth.persona.roles.includes("admin") &&
        auth.persona.profileId !== studentId
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot flag another student grade.",
        );
      }
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"GradeFlagCreateRequest"> | null;
      if (!body?.attempt_id || !body?.details) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "attempt_id and details are required.",
        );
      }
      const flag: ApiSchema<"GradeFlag"> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        attempt_id: body.attempt_id,
        reported_stage: body.reported_stage ?? "midterm",
        reported_grade_text: body.reported_grade_text ?? null,
        issue_type: body.issue_type,
        details: body.details,
        status: "open",
        resolution_action: null,
        corrected_grade: null,
        corrected_status: null,
        resolution_note: null,
        resolved_by: null,
        resolved_at: null,
        created_at: "2026-11-10T09:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
      };
      getMockDatabase().gradeFlags.push(flag);
      return HttpResponse.json(flag, { status: 201 });
    },
  ),

  http.post(
    "*/functions/v1/grade-flags/:flag_id/resolve",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const db = getMockDatabase();
      const flag = db.gradeFlags.find(
        (item) => item.id === String(params.flag_id),
      );
      if (!flag) return errorJson(404, "NOT_FOUND", "Grade flag not found.");
      const attempt = db.attemptResults.find(
        (item) =>
          item.id === flag.attempt_id && item.student_id === flag.student_id,
      );
      if (!attempt)
        return errorJson(
          404,
          "NOT_FOUND",
          "The flagged attempt was not found.",
        );
      if (
        !db.adviserAssignments.some(
          (item) =>
            item.student_id === flag.student_id &&
            item.adviser_id === auth.persona.profileId &&
            item.end_date === null,
        )
      )
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser may resolve this flag.",
        );
      if (attemptEncodingClosed(flag.student_id, attempt.id))
        return encodingClosedResponse();
      const term = db.schoolTerms.find(
        (t) =>
          t.id ===
          db.courseOfferings.find((o) => o.id === attempt.course_offering_id)
            ?.school_term_id,
      );
      if (term?.is_locked && !term.override_flag)
        return errorJson(
          409,
          "TERM_LOCKED",
          "Corrections require an editable term.",
        );
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"GradeFlagResolveRequest"> | null;
      if (
        !body ||
        !["correct", "reject"].includes(String(body.resolution_action)) ||
        !body.resolution_note?.trim() ||
        (body.resolution_action === "correct" &&
          body.corrected_grade == null &&
          body.corrected_status == null &&
          body.corrected_midterm_status == null)
      )
        return errorJson(
          400,
          "INVALID_INPUT",
          "Choose a resolution and provide a reason and correction.",
        );
      const currentAttempt = db.attemptResults.find(
        (item) =>
          item.id === flag.attempt_id && item.student_id === flag.student_id,
      );
      if (!currentAttempt)
        return errorJson(
          404,
          "NOT_FOUND",
          "The flagged attempt was not found.",
        );
      if (
        body.expected_revision != null &&
        body.expected_revision !== currentAttempt.revision
      )
        return errorJson(
          409,
          "STALE_ATTEMPT",
          "The attempt changed since the flag was raised.",
        );
      if (body.resolution_action === "correct") {
        const result = { ...currentAttempt };
        if (flag.reported_stage === "midterm") {
          if (currentAttempt.completion_grade != null)
            return errorJson(
              409,
              "INC_COMPLETION_EXISTS",
              "Use the INC completion correction operation.",
            );
          if (
            body.corrected_midterm_status != null &&
            !["graded", "dr"].includes(body.corrected_midterm_status)
          )
            return errorJson(
              400,
              "INVALID_INPUT",
              "Provide a valid midterm status.",
            );
          if (
            body.corrected_grade != null &&
            (!Number.isFinite(body.corrected_grade) ||
              body.corrected_grade < 1 ||
              body.corrected_grade > 5 ||
              (body.corrected_grade * 4) % 1 !== 0)
          )
            return errorJson(
              400,
              "INVALID_INPUT",
              "Provide a valid midterm grade.",
            );
          if (body.corrected_midterm_status === "dr") {
            if (
              body.corrected_grade != null ||
              (body.corrected_status != null && body.corrected_status !== "dr")
            )
              return errorJson(
                400,
                "INVALID_INPUT",
                "A dropped midterm requires a dropped final and no numeric grade.",
              );
            result.midterm_status = "dr";
            result.midterm_grade = null;
            result.recorded_status = "dr";
            result.effective_status = "dr";
            result.final_grade = null;
            result.gwa_grade = null;
            result.inc_deadline = null;
            result.is_lapsed_inc = false;
          } else {
            if (body.corrected_grade != null) {
              result.midterm_grade = body.corrected_grade;
              result.midterm_status = "graded";
            } else if (body.corrected_midterm_status)
              result.midterm_status = body.corrected_midterm_status;
            if (
              currentAttempt.midterm_status === "dr" &&
              result.midterm_status !== "dr"
            ) {
              result.recorded_status = "currently_enrolled";
              result.effective_status = "currently_enrolled";
            }
            if (
              body.corrected_status === "dr" ||
              result.recorded_status === "dr"
            )
              return errorJson(
                400,
                "INVALID_INPUT",
                "A dropped final requires a dropped midterm.",
              );
            if (result.final_grade != null) {
              result.recorded_status =
                result.final_grade <= 3 ? "passed" : "failed";
              result.effective_status = result.recorded_status;
            }
          }
        } else {
          if (body.corrected_grade != null) {
            if (
              !Number.isFinite(body.corrected_grade) ||
              body.corrected_grade < 1 ||
              body.corrected_grade > 5 ||
              (body.corrected_grade * 4) % 1 !== 0
            )
              return errorJson(
                400,
                "INVALID_INPUT",
                "Provide a valid final grade.",
              );
            const gradeStatus = body.corrected_grade <= 3 ? "passed" : "failed";
            if (
              body.corrected_status != null &&
              body.corrected_status !== gradeStatus
            )
              return errorJson(
                400,
                "INVALID_INPUT",
                "The corrected status must match the corrected final grade.",
              );
            result.final_grade = body.corrected_grade;
            result.gwa_grade = body.corrected_grade;
            result.effective_status = gradeStatus;
            result.recorded_status = result.effective_status;
            result.inc_deadline = null;
          }
          if (body.corrected_status) {
            if (
              body.corrected_status === "inc" &&
              body.corrected_grade == null
            ) {
              if (
                currentAttempt.completion_grade != null ||
                currentAttempt.resolved_at != null ||
                db.incResolutions.some(
                  (resolution) =>
                    resolution.attempt_id === currentAttempt.id &&
                    resolution.student_id === currentAttempt.student_id,
                )
              ) {
                return errorJson(
                  409,
                  "INC_COMPLETION_EXISTS",
                  "Use the INC completion correction operation.",
                );
              }
              const deadline = term?.default_inc_deadline;
              if (!deadline)
                return errorJson(
                  409,
                  "INC_DEADLINE_UNAVAILABLE",
                  "The term has no default INC deadline.",
                );
              result.final_grade = null;
              result.gwa_grade = null;
              result.completion_grade = null;
              result.resolved_at = null;
              result.inc_deadline = deadline;
              result.is_lapsed_inc = false;
            }
            result.effective_status = body.corrected_status;
            result.recorded_status = body.corrected_status;
          }
          if (body.corrected_midterm_status)
            result.midterm_status = body.corrected_midterm_status;
        }
        db.attemptResults[db.attemptResults.indexOf(currentAttempt)] = {
          ...result,
          revision: currentAttempt.revision + 1,
          updated_at: new Date().toISOString(),
        };
      }
      const now = new Date().toISOString();
      const resolved: ApiSchema<"GradeFlag"> = {
        ...flag,
        status: body.resolution_action === "reject" ? "rejected" : "corrected",
        resolution_action: body.resolution_action,
        corrected_grade: body.corrected_grade ?? null,
        corrected_status: body.corrected_status ?? null,
        resolution_note: body.resolution_note,
        resolved_by: auth.persona.profileId,
        resolved_at: now,
        updated_at: now,
      };
      db.gradeFlags[db.gradeFlags.indexOf(flag)] = resolved;
      return HttpResponse.json(resolved, { status: 200 });
    },
  ),

  http.post("*/functions/v1/grades/import", async ({ request }) => {
    const auth = authenticateRequest(request, ["adviser"]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"GradeBatchImportRequest"> | null;
    if (
      !body ||
      !body.school_term_id ||
      !Array.isArray(body.rows) ||
      !body.rows.length ||
      body.rows.length > 500
    )
      return errorJson(
        400,
        "INVALID_INPUT",
        "Provide a term and 1 to 500 grade rows.",
      );
    const db = getMockDatabase();
    const getRow = (
      row: ApiSchema<"GradeBatchImportRequest">["rows"][number],
    ) => {
      const student = db.profiles.find(
        (profile) => profile.student_number === row.student_number,
      );
      const course = db.courses.find(
        (item) => item.code.toLowerCase() === row.course_code.toLowerCase(),
      );
      const offering = db.courseOfferings.find(
        (item) =>
          item.course_id === course?.id &&
          item.school_term_id === body.school_term_id,
      );
      const assigned = Boolean(
        student &&
        db.adviserAssignments.some(
          (item) =>
            item.student_id === student.id &&
            item.adviser_id === auth.persona.profileId &&
            item.end_date === null,
        ),
      );
      const term = db.schoolTerms.find(
        (item) => item.id === body.school_term_id,
      );
      const old = db.attemptResults.find(
        (attempt) =>
          attempt.student_id === student?.id &&
          attempt.course_offering_id === offering?.id,
      );
      const final = row.final_grade ?? old?.final_grade ?? null;
      const midterm = row.midterm_grade ?? old?.midterm_grade ?? null;
      const midtermStatus =
        row.midterm_status ?? old?.midterm_status ?? "graded";
      const status =
        row.status ??
        (final == null
          ? "currently_enrolled"
          : final <= 3
            ? "passed"
            : "failed");
      const validGrade = (grade: unknown) =>
        grade == null ||
        (typeof grade === "number" &&
          Number.isFinite(grade) &&
          grade >= 1 &&
          grade <= 5 &&
          (grade * 4) % 1 === 0);
      const invalid =
        !validGrade(row.midterm_grade) ||
        !validGrade(row.final_grade) ||
        !["passed", "failed", "currently_enrolled", "inc", "dr", "na"].includes(
          status,
        ) ||
        !["graded", "dr"].includes(midtermStatus) ||
        (midtermStatus === "dr" && (midterm != null || status !== "dr")) ||
        (status === "dr" && midtermStatus !== "dr") ||
        (final != null && status !== (final <= 3 ? "passed" : "failed")) ||
        (final == null && (status === "passed" || status === "failed"));
      const reason =
        !student || !course || !offering
          ? "Student, course, or term offering not found."
          : !assigned
            ? "Student is not currently assigned to this adviser."
            : term?.is_locked && !term.override_flag
              ? "The school term is locked."
              : status === "inc" &&
                  old &&
                  (old.completion_grade != null ||
                    old.resolved_at != null ||
                    db.incResolutions.some(
                      (resolution) =>
                        resolution.attempt_id === old.id &&
                        resolution.student_id === student?.id,
                    ))
                ? "Use the INC completion correction operation for a resolved attempt."
                : invalid
                  ? "Invalid grade or inconsistent status."
                  : old?.final_grade != null &&
                      row.final_grade != null &&
                      old.final_grade !== row.final_grade
                    ? "Use grade correction to change an existing final grade."
                    : alreadyPassedCourse(student.id, offering.id)
                      ? "A passed course cannot be retaken."
                      : departmentEncodingClosed(
                            student.id,
                            body.school_term_id,
                          )
                        ? "The student department encoding is closed."
                        : "";
      return { student, course, offering, reason };
    };
    const checks = body.rows.map((row, index) => {
      const check = getRow(row);
      if (
        body.rows
          .slice(0, index)
          .some(
            (previous) =>
              previous.student_number === row.student_number &&
              previous.course_code.toLowerCase() ===
                row.course_code.toLowerCase(),
          )
      )
        check.reason = "Duplicate student and course in import.";
      return check;
    });
    const results: ApiSchema<"GradeBatchImportResponse">["results"] =
      body.rows.map((row, index) => ({
        row_number: row.row_number,
        student_number: row.student_number,
        course_code: row.course_code,
        outcome: checks[index].reason
          ? "error"
          : body.mode === "commit"
            ? "imported"
            : "valid",
        message: checks[index].reason || "Validated successfully.",
      }));
    const valid = body.rows
      .map((row, index) => ({ row, check: checks[index] }))
      .filter(({ check }) => !check.reason);
    if (body.mode === "commit")
      for (const { row, check } of valid) {
        const { student, course, offering } = check;
        if (!student || !course || !offering) continue;
        const old = db.attemptResults.find(
          (attempt) =>
            attempt.student_id === student.id &&
            attempt.course_offering_id === offering.id,
        );
        const final = row.final_grade ?? old?.final_grade ?? null;
        const status =
          row.status ??
          (final == null
            ? "currently_enrolled"
            : final <= 3
              ? "passed"
              : "failed");
        const slotId =
          row.curriculum_term_course_id ??
          db.curriculumTermCourses.find((slot) => slot.course_id === course.id)
            ?.id ??
          null;
        const now = new Date().toISOString();
        const result: ApiSchema<"AttemptResult"> = {
          id: old?.id ?? nextSyntheticUuid(),
          student_id: student.id,
          course_offering_id: offering.id,
          curriculum_term_course_id: slotId,
          recorded_status: status,
          effective_status: status,
          midterm_status: row.midterm_status ?? old?.midterm_status ?? "graded",
          midterm_grade: row.midterm_grade ?? old?.midterm_grade ?? null,
          final_grade: final,
          instructor: row.instructor ?? old?.instructor ?? offering.instructor,
          inc_deadline:
            status === "inc"
              ? (old?.inc_deadline ??
                db.schoolTerms.find((term) => term.id === body.school_term_id)
                  ?.default_inc_deadline ??
                null)
              : null,
          prerequisite_override: old?.prerequisite_override ?? false,
          prerequisite_grade_override:
            old?.prerequisite_grade_override ?? false,
          grade_fix_history: old?.grade_fix_history ?? [],
          units_attempted: old?.units_attempted ?? course.units,
          revision: (old?.revision ?? 0) + 1,
          created_at: old?.created_at ?? now,
          updated_at: now,
          completion_grade:
            status === "inc" ? null : (old?.completion_grade ?? null),
          resolved_at: status === "inc" ? null : (old?.resolved_at ?? null),
          gwa_grade: final,
          is_lapsed_inc: false,
          is_repeated: false,
          counts_toward_cumulative_gwa: false,
        };
        if (old) db.attemptResults[db.attemptResults.indexOf(old)] = result;
        else db.attemptResults.push(result);
        if (row.remark?.trim())
          db.attemptRemarks.push({
            id: nextSyntheticUuid(),
            student_id: student.id,
            authored_by: auth.persona.profileId,
            body_text: row.remark,
            created_at: now,
            attempt_id: result.id,
            curriculum_term_course_id: slotId,
          });
      }
    return HttpResponse.json(
      {
        mode: body.mode,
        valid_count: valid.length,
        warning_count: 0,
        error_count: results.length - valid.length,
        imported_count: body.mode === "commit" ? valid.length : 0,
        results,
      },
      { status: 200 },
    );
  }),

  // ===========================================================================
  // 7. Electives, Equivalencies, Outside Credits, Transfers & Assignments
  // ===========================================================================
  http.put(
    "*/functions/v1/students/:student_id/adviser",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"AdviserReassignmentRequest">;
      const db = getMockDatabase();
      const student = db.profiles.find((p) => p.id === studentId);
      const adviser = db.profiles.find((p) => p.id === body.adviser_id);
      if (!student || !adviser)
        return errorJson(404, "NOT_FOUND", "Student or adviser not found.");
      if (
        !auth.persona.departmentId ||
        student.department_id !== auth.persona.departmentId ||
        adviser.department_id !== auth.persona.departmentId
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Reassignment is limited to your department.",
        );
      }
      if (!adviser.roles?.includes("adviser") || adviser.status !== "active")
        return errorJson(
          409,
          "INVALID_ADVISER",
          "Choose an active adviser in the department.",
        );
      const previous = db.adviserAssignments.find(
        (a) => a.student_id === studentId && a.end_date === null,
      );
      if (
        !previous ||
        !body.start_date ||
        body.start_date < previous.start_date ||
        !body.reason?.trim()
      )
        return errorJson(
          409,
          "INVALID_ASSIGNMENT",
          "An active assignment, valid effective date and reason are required.",
        );
      const closed = {
        ...previous,
        end_date: body.start_date,
        handed_over_to_adviser_id: adviser.id,
        handed_over_to_name: adviser.full_name,
      };
      const assignment: ApiSchema<"AdviserAssignment"> = {
        id: nextSyntheticUuid(),
        adviser_id: adviser.id,
        adviser_name: adviser.full_name,
        adviser_email: adviser.email,
        adviser_faculty_name: "Faculty of Computing",
        adviser_consultation_hours: "Tue & Thu, 13:00â€“16:00",
        student_id: studentId,
        start_date: body.start_date ?? "2026-11-10",
        end_date: null,
        handed_over_to_adviser_id: null,
        handed_over_to_name: null,
        handover_label: null,
        created_at: "2026-11-10T09:00:00Z",
      };
      db.adviserAssignments[db.adviserAssignments.indexOf(previous)] = closed;
      db.adviserAssignments.push(assignment);
      const org = db.studentOrganizations.find(
        (o) => o.student_id === studentId,
      );
      if (org)
        db.studentOrganizations[db.studentOrganizations.indexOf(org)] = {
          ...org,
          adviser_id: adviser.id,
        };
      return HttpResponse.json([closed, assignment], { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/adviser-assignments/bulk-reassign",
    async ({ request }) => {
      const auth = authenticateRequest(request, [
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"BulkAdviserReassignmentRequest">;
      const studentIds = body.student_ids ?? [MOCK_IDS.studentPrimary];
      const db = getMockDatabase();
      const adviser = db.profiles.find((p) => p.id === body.adviser_id);
      const students = studentIds.map((id) =>
        db.profiles.find((p) => p.id === id),
      );
      if (!adviser || students.some((student) => !student))
        return errorJson(404, "NOT_FOUND", "Student or adviser not found.");
      if (
        !auth.persona.departmentId ||
        adviser.department_id !== auth.persona.departmentId ||
        students.some(
          (student) => student?.department_id !== auth.persona.departmentId,
        )
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Reassignment is limited to your department.",
        );
      }
      if (!adviser.roles?.includes("adviser") || adviser.status !== "active")
        return errorJson(
          409,
          "INVALID_ADVISER",
          "Choose an active adviser in the department.",
        );
      const previous = studentIds.map((studentId) =>
        db.adviserAssignments.find(
          (a) => a.student_id === studentId && a.end_date === null,
        ),
      );
      if (
        !studentIds.length ||
        new Set(studentIds).size !== studentIds.length ||
        !body.reason?.trim() ||
        !body.effective_since ||
        previous.some((a) => !a || body.effective_since < a.start_date)
      )
        return errorJson(
          409,
          "INVALID_ASSIGNMENT",
          "Each student needs an active assignment, valid effective date and reason.",
        );
      const assignments: ApiSchema<"AdviserAssignment">[] = studentIds.map(
        (studentId) => ({
          id: nextSyntheticUuid(),
          adviser_id: adviser.id,
          adviser_name: adviser.full_name,
          adviser_email: adviser.email,
          adviser_faculty_name: null,
          adviser_consultation_hours: adviser.consultation_hours ?? null,
          student_id: studentId,
          start_date: body.effective_since,
          end_date: null,
          handed_over_to_adviser_id: null,
          handed_over_to_name: null,
          handover_label: null,
          created_at: "2026-11-10T09:00:00Z",
        }),
      );
      previous.forEach((old, index) => {
        const current = old!;
        db.adviserAssignments[db.adviserAssignments.indexOf(current)] = {
          ...current,
          end_date: body.effective_since,
          handed_over_to_adviser_id: adviser.id,
          handed_over_to_name: adviser.full_name,
        };
        db.adviserAssignments.push(assignments[index]);
        const org = db.studentOrganizations.find(
          (o) => o.student_id === current.student_id,
        );
        if (org)
          db.studentOrganizations[db.studentOrganizations.indexOf(org)] = {
            ...org,
            adviser_id: adviser.id,
          };
      });
      assignments.forEach((assignment) =>
        recordMockAudit(auth.persona, {
          action: "adviser_reassigned",
          entityType: "adviser_assignment",
          entityId: assignment.id,
          studentId: assignment.student_id,
          label: "Adviser assignment",
          details: `Reassigned to ${adviser.full_name} effective ${body.effective_since}. Reason: ${body.reason?.trim()}`,
        }),
      );
      const res: ApiSchema<"BulkAdviserReassignmentResponse"> = {
        reassigned_count: assignments.length,
        assignments,
      };
      return HttpResponse.json(res, { status: 200 });
    },
  ),

  http.put(
    "*/functions/v1/students/:student_id/curriculum",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "department_staff",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"CurriculumAssignmentRequest">;
      const org: ApiSchema<"StudentOrganization"> = {
        student_id: studentId,
        student_curriculum_assignment_id: nextSyntheticUuid(),
        curriculum_version_id:
          body.curriculum_version_id ?? MOCK_IDS.curriculumBscs2024,
        program_id: body.program_id ?? MOCK_IDS.programBscs,
        department_id: MOCK_IDS.deptDcst,
        faculty_id: MOCK_IDS.facultyComputing,
        adviser_id: MOCK_IDS.adviserPrimary,
        entry_year: 2024,
      };
      return HttpResponse.json(org, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/elective-mappings",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"ElectiveMappingRequest">;
      const mapping: ApiSchema<"ElectiveMapping"> = {
        id: nextSyntheticUuid(),
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id:
          body.curriculum_term_course_id ?? MOCK_IDS.slotFreeElective1,
        mapped_by: auth.persona.profileId,
        units_credited: 3,
        created_at: "2026-11-10T09:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
        student_id: studentId,
        revoked_at: null,
      };
      return HttpResponse.json(mapping, { status: 201 });
    },
  ),

  http.patch(
    "*/functions/v1/students/:student_id/elective-mappings/:decision_id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const decisionId = String(params.decision_id);
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"ElectiveMappingUpdate">;
      const mapping: ApiSchema<"ElectiveMapping"> = {
        id: decisionId,
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id:
          body.curriculum_term_course_id ?? MOCK_IDS.slotFreeElective1,
        mapped_by: auth.persona.profileId,
        units_credited: 3,
        created_at: "2026-08-20T08:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
        student_id: studentId,
        revoked_at: null,
      };
      return HttpResponse.json(mapping, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/elective-mappings/:decision_id/revoke",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const decisionId = String(params.decision_id);
      const mapping: ApiSchema<"ElectiveMapping"> = {
        id: decisionId,
        attempt_id: MOCK_IDS.attemptCsci153Open,
        curriculum_term_course_id: MOCK_IDS.slotFreeElective1,
        mapped_by: auth.persona.profileId,
        units_credited: 3,
        created_at: "2026-08-20T08:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
        student_id: studentId,
        revoked_at: "2026-11-10T09:00:00Z",
      };
      return HttpResponse.json(mapping, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/equivalencies",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"EquivalencyDecisionRequest">;
      const eq: ApiSchema<"EquivalencyDecision"> = {
        id: nextSyntheticUuid(),
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id:
          body.destination_curriculum_term_course_id ?? MOCK_IDS.slotCsci102,
        decision_type: body.decision_type ?? "transfer_equivalency",
        decided_by: auth.persona.profileId,
        decided_at: "2026-11-10T09:00:00Z",
        units_credited: 3,
        student_id: studentId,
        updated_at: "2026-11-10T09:00:00Z",
        revoked_at: null,
      };
      return HttpResponse.json(eq, { status: 201 });
    },
  ),

  http.patch(
    "*/functions/v1/students/:student_id/equivalencies/:decision_id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const decisionId = String(params.decision_id);
      const body = (await request
        .json()
        .catch(() => ({}))) as ApiSchema<"EquivalencyDecisionEdit">;
      const eq: ApiSchema<"EquivalencyDecision"> = {
        id: decisionId,
        attempt_id: body.attempt_id ?? MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id:
          body.destination_curriculum_term_course_id ?? MOCK_IDS.slotCsci102,
        decision_type: body.decision_type ?? "transfer_equivalency",
        decided_by: auth.persona.profileId,
        decided_at: "2026-08-20T08:00:00Z",
        units_credited: 3,
        student_id: studentId,
        updated_at: "2026-11-10T09:00:00Z",
        revoked_at: null,
      };
      return HttpResponse.json(eq, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/equivalencies/:decision_id/revoke",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const decisionId = String(params.decision_id);
      const eq: ApiSchema<"EquivalencyDecision"> = {
        id: decisionId,
        attempt_id: MOCK_IDS.attemptCsci102Inc,
        destination_curriculum_term_course_id: MOCK_IDS.slotCsci102,
        decision_type: "transfer_equivalency",
        decided_by: auth.persona.profileId,
        decided_at: "2026-08-20T08:00:00Z",
        units_credited: 3,
        student_id: studentId,
        updated_at: "2026-11-10T09:00:00Z",
        revoked_at: "2026-11-10T09:00:00Z",
      };
      return HttpResponse.json(eq, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/outside-credits",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "department_head"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"OutsideCreditCreateRequest"> | null;
      const fields = [
        "entry_type",
        "origin_school",
        "original_course_code",
        "original_course_title",
        "units",
        "grade",
        "destination_curriculum_term_course_id",
        "reason",
      ];
      const text = (value: unknown, max: number): value is string =>
        typeof value === "string" && !!value.trim() && value.length <= max;
      if (
        !body ||
        Object.keys(body).some((key) => !fields.includes(key)) ||
        !["transferee", "shiftee"].includes(body.entry_type) ||
        !text(body.origin_school, 250) ||
        !text(body.original_course_code, 100) ||
        !text(body.original_course_title, 250) ||
        !text(body.reason, 2000) ||
        typeof body.units !== "number" ||
        !Number.isFinite(body.units) ||
        body.units <= 0 ||
        !Number.isInteger(body.units * 4) ||
        typeof body.grade !== "string" ||
        !/^(?:[12]\.\d{2}|3\.00)$/.test(body.grade) ||
        typeof body.destination_curriculum_term_course_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          body.destination_curriculum_term_course_id,
        )
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Provide valid outside-credit details and a reason.",
        );
      }
      const db = getMockDatabase();
      const org = db.studentOrganizations.find(
        (row) => row.student_id === studentId,
      );
      const slot = db.curriculumTermCourses.find(
        (row) => row.id === body.destination_curriculum_term_course_id,
      );
      if (!org || !slot)
        return errorJson(
          404,
          "NOT_FOUND",
          "Student or destination slot not found.",
        );
      if (!canAccessStudentRecord(auth.persona, studentId)) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      }
      const term = db.curriculumTerms.find(
        (row) => row.id === slot.curriculum_term_id,
      );
      if (term?.curriculum_version_id !== org.curriculum_version_id) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Choose a slot in the student curriculum.",
        );
      }
      const normalize = (value: string) =>
        value.trim().replace(/\s+/g, " ").toLowerCase();
      const live = db.outsideCredits.filter(
        (row) => row.student_id === studentId && !row.revoked_at,
      );
      if (
        live.some(
          (row) =>
            normalize(row.origin_school) === normalize(body.origin_school) &&
            normalize(row.original_course_code) ===
              normalize(body.original_course_code),
        )
      ) {
        return errorJson(
          409,
          "DUPLICATE_CREDIT",
          "This student already has credit for this course from this origin.",
        );
      }
      const passed = db.attemptResults.some(
        (row) =>
          row.student_id === studentId &&
          row.effective_status === "passed" &&
          (row.curriculum_term_course_id === slot.id ||
            (!!slot.course_id &&
              db.courseOfferings.some(
                (offering) =>
                  offering.id === row.course_offering_id &&
                  offering.course_id === slot.course_id,
              ))),
      );
      const mapped = db.electiveMappings.some(
        (row) =>
          row.student_id === studentId &&
          !row.revoked_at &&
          row.curriculum_term_course_id === slot.id,
      );
      const equivalent = db.equivalencyDecisions.some(
        (row) =>
          row.student_id === studentId &&
          !row.revoked_at &&
          row.destination_curriculum_term_course_id === slot.id,
      );
      if (
        passed ||
        mapped ||
        equivalent ||
        live.some(
          (row) => row.destination_curriculum_term_course_id === slot.id,
        )
      ) {
        return errorJson(
          409,
          "SLOT_ALREADY_SATISFIED",
          "This curriculum slot is already satisfied.",
        );
      }
      const credit: ApiSchema<"OutsideCredit"> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        entry_type: body.entry_type ?? "transferee",
        origin_school: body.origin_school ?? "UP Cebu",
        original_course_code: body.original_course_code ?? "CMSC 11",
        original_course_title:
          body.original_course_title ?? "Introduction to Computer Science",
        units: body.units ?? 3,
        grade: body.grade ?? "1.50",
        destination_curriculum_term_course_id:
          body.destination_curriculum_term_course_id ?? MOCK_IDS.slotCsci101,
        units_credited: body.units ?? 3,
        decided_by: auth.persona.profileId,
        decided_at: "2026-11-10T09:00:00Z",
        revoked_at: null,
        updated_at: "2026-11-10T09:00:00Z",
      };
      getMockDatabase().outsideCredits.push(credit);
      return HttpResponse.json(credit, { status: 201 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/outside-credits/:credit_id/revoke",
    ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId))
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is outside your authorized scope.",
        );
      const creditId = String(params.credit_id);
      const credit: ApiSchema<"OutsideCredit"> = {
        id: creditId,
        student_id: studentId,
        entry_type: "transferee",
        origin_school: "UP Cebu",
        original_course_code: "CMSC 11",
        original_course_title: "Introduction to Computer Science",
        units: 3,
        grade: "1.50",
        destination_curriculum_term_course_id: MOCK_IDS.slotCsci101,
        units_credited: 3,
        decided_by: auth.persona.profileId,
        decided_at: "2026-08-10T08:00:00Z",
        revoked_at: "2026-11-10T09:00:00Z",
        updated_at: "2026-11-10T09:00:00Z",
      };
      return HttpResponse.json(credit, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/curriculum-transfers",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const db = getMockDatabase();
      if (
        !db.adviserAssignments.some(
          (item) =>
            item.student_id === studentId &&
            item.adviser_id === auth.persona.profileId &&
            item.end_date === null,
        )
      )
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser may endorse a transfer.",
        );
      const body = (await request
        .json()
        .catch(
          () => null,
        )) as ApiSchema<"CurriculumTransferEndorseRequest"> | null;
      const org = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      const target = db.curriculumVersions.find(
        (item) =>
          item.id === body?.to_curriculum_version_id &&
          item.status === "active",
      );
      if (!org || !target)
        return errorJson(
          404,
          "NOT_FOUND",
          "Student or active target curriculum not found.",
        );
      if (
        !body?.endorsement_note?.trim() ||
        body.endorsement_note.length > 2000 ||
        target.id === org.curriculum_version_id
      )
        return errorJson(
          400,
          "INVALID_INPUT",
          "Choose a different active curriculum and provide a reason.",
        );
      if (
        db.curriculumTransferRequests.some(
          (item) => item.student_id === studentId && item.status === "pending",
        )
      )
        return errorJson(
          409,
          "TRANSFER_ALREADY_PENDING",
          "A transfer request is already pending.",
        );
      const targetSlots = db.curriculumTermCourses.filter((slot) =>
        db.curriculumTerms.some(
          (term) =>
            term.id === slot.curriculum_term_id &&
            term.curriculum_version_id === target.id,
        ),
      );
      const passedCourseIds = new Set(
        db.attemptResults
          .filter(
            (attempt) =>
              attempt.student_id === studentId &&
              attempt.effective_status === "passed",
          )
          .map(
            (attempt) =>
              db.courseOfferings.find(
                (offering) => offering.id === attempt.course_offering_id,
              )?.course_id,
          )
          .filter(Boolean),
      );
      const carried = targetSlots
        .filter((slot) => slot.course_id && passedCourseIds.has(slot.course_id))
        .reduce((sum, slot) => sum + slot.nominal_units, 0);
      const now = new Date().toISOString();
      const req: ApiSchema<"CurriculumTransferRequest"> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        from_curriculum_version_id: org.curriculum_version_id,
        to_curriculum_version_id: target.id,
        endorsed_by: auth.persona.profileId,
        endorsement_note: body.endorsement_note.trim(),
        status: "pending",
        decided_by: null,
        decided_at: null,
        decision_note: null,
        carried_units: carried,
        created_at: now,
        updated_at: now,
      };
      db.curriculumTransferRequests.push(req);
      return HttpResponse.json(req, { status: 201 });
    },
  ),

  http.post(
    "*/functions/v1/curriculum-transfers/:transfer_id/decision",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "department_head"]);
      if ("response" in auth) return auth.response;
      const transferId = String(params.transfer_id);
      const body = (await request
        .json()
        .catch(
          () => null,
        )) as ApiSchema<"CurriculumTransferDecisionRequest"> | null;
      if (
        !body ||
        Object.keys(body).some(
          (key) => !["decision", "decision_note"].includes(key),
        ) ||
        !["approved", "rejected"].includes(body.decision) ||
        (body.decision_note != null &&
          (typeof body.decision_note !== "string" ||
            body.decision_note.length > 2000)) ||
        (body.decision === "rejected" &&
          (typeof body.decision_note !== "string" ||
            !body.decision_note.trim()))
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Choose a valid decision and provide a rejection reason of at most 2,000 characters.",
        );
      }
      const db = getMockDatabase();
      const existing = db.curriculumTransferRequests.find(
        (t) => t.id === transferId,
      );
      if (!existing)
        return errorJson(404, "NOT_FOUND", "Transfer request not found.");
      if (existing.status !== "pending")
        return errorJson(
          409,
          "TRANSFER_ALREADY_DECIDED",
          "Transfer has already been decided.",
        );
      const org = db.studentOrganizations.find(
        (o) => o.student_id === existing.student_id,
      );
      const target = db.curriculumVersions.find(
        (c) => c.id === existing.to_curriculum_version_id,
      );
      const program = db.programs.find((p) => p.id === target?.program_id);
      const department = db.departments.find(
        (d) => d.id === program?.department_id,
      );
      if (!org || !target || !program || !department)
        return errorJson(
          409,
          "INVALID_TRANSFER",
          "Transfer assignments are incomplete.",
        );
      if (
        !auth.persona.roles.includes("admin") &&
        auth.persona.departmentId !== org.department_id
      )
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      if (body.decision === "approved") {
        const old = db.studentCurriculumAssignments.find(
          (a) => a.student_id === existing.student_id && a.end_date === null,
        );
        if (!old)
          return errorJson(
            409,
            "INVALID_TRANSFER",
            "Current curriculum assignment not found.",
          );
        const today = "2026-11-10";
        const current = { ...old, end_date: today };
        const next = {
          ...old,
          id: nextSyntheticUuid(),
          curriculum_version_id: target.id,
          start_date: today,
          end_date: null,
          change_note: "Approved curriculum transfer",
          created_at: `${today}T09:00:00Z`,
        };
        db.studentCurriculumAssignments[
          db.studentCurriculumAssignments.indexOf(old)
        ] = current;
        db.studentCurriculumAssignments.push(next);
        db.studentOrganizations[db.studentOrganizations.indexOf(org)] = {
          ...org,
          student_curriculum_assignment_id: next.id,
          curriculum_version_id: target.id,
          program_id: program.id,
          department_id: department.id,
          faculty_id: department.faculty_id,
        };
        const profile = db.profiles.find((p) => p.id === existing.student_id);
        if (profile)
          db.profiles[db.profiles.indexOf(profile)] = {
            ...profile,
            department_id: department.id,
            faculty_id: department.faculty_id,
          };
      }
      const req: ApiSchema<"CurriculumTransferRequest"> = {
        ...existing,
        status: body.decision,
        decided_by: auth.persona.profileId,
        decided_at: "2026-11-10T09:00:00Z",
        decision_note: body.decision_note ?? null,
        updated_at: "2026-11-10T09:00:00Z",
      };
      db.curriculumTransferRequests[
        db.curriculumTransferRequests.indexOf(existing)
      ] = req;
      return HttpResponse.json(req, { status: 200 });
    },
  ),

  http.post("*/functions/v1/students/import", async ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "department_head",
      "department_staff",
    ]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"StudentBatchImportRequest"> | null;
    if (!body?.mode || !Array.isArray(body.rows)) {
      return errorJson(400, "INVALID_INPUT", "mode and rows are required.");
    }
    const db = getMockDatabase();
    const seenNumbers = new Set<string>();
    const seenEmails = new Set<string>();
    const checks = body.rows.map((row) => {
      const program = db.programs.find((item) => item.id === row.program_id);
      const department = db.departments.find(
        (item) => item.id === program?.department_id,
      );
      if (
        program &&
        !auth.persona.roles.includes("admin") &&
        !canAccessDepartment(auth.persona, program.department_id)
      ) {
        return {
          row,
          error: "The program is outside your authorized department." as const,
          program: null,
          department: null,
          adviser: null,
        };
      }

      const adviser = db.profiles.find(
        (item) =>
          item.id === row.adviser_id &&
          item.status === "active" &&
          (item.roles ?? [item.role]).includes("adviser"),
      );
      const curriculum = db.curriculumVersions.find(
        (item) =>
          item.id === row.curriculum_version_id &&
          item.program_id === row.program_id &&
          item.status === "active",
      );
      const normalizedEmail = row.email.trim().toLowerCase();
      const duplicateNumber =
        seenNumbers.has(row.student_number) ||
        db.profiles.some(
          (profile) => profile.student_number === row.student_number,
        );
      const duplicateEmail =
        seenEmails.has(normalizedEmail) ||
        db.profiles.some(
          (profile) => profile.email.toLowerCase() === normalizedEmail,
        );
      seenNumbers.add(row.student_number);
      seenEmails.add(normalizedEmail);

      let error: string | null = null;
      if (!/^\d{2}-\d-\d{5}$/.test(row.student_number)) {
        error = "Student number must follow YY-N-NNNNN.";
      } else if (duplicateNumber) {
        error = "Student number already exists.";
      } else if (duplicateEmail) {
        error = "Institutional email already exists.";
      } else if (!program || !department || !curriculum) {
        error = "A matching active program and curriculum are required.";
      } else if (
        !adviser ||
        adviser.department_id !== program.department_id ||
        !canAccessDepartment(auth.persona, program.department_id)
      ) {
        error =
          "An eligible active adviser in the authorized department is required.";
      }

      return { row, error, program, department, adviser };
    });
    const unauthorized = checks.find(
      (check) =>
        check.error === "The program is outside your authorized department.",
    );
    if (unauthorized) {
      return errorJson(403, "INSUFFICIENT_PRIVILEGE", unauthorized.error);
    }

    const validChecks = checks.filter((check) => check.error === null);
    const validCount = validChecks.length;
    if (body.mode === "commit") {
      const createdAt = "2026-11-10T09:00:00Z";
      const importedByCurriculum = new Map<string, number>();
      for (const { row, program, department, adviser } of validChecks) {
        if (!program || !department || !adviser) continue;
        const studentId = nextSyntheticUuid();
        const assignmentId = nextSyntheticUuid();
        db.profiles.push({
          id: studentId,
          role: "student",
          roles: ["student"],
          email: row.email.trim(),
          full_name: row.full_name.trim(),
          student_number: row.student_number,
          status: "active",
          created_at: createdAt,
          updated_at: createdAt,
          faculty_id: department.faculty_id,
          department_id: department.id,
          avatar_url: null,
          consultation_hours: null,
        });
        db.roleAssignments.push({
          id: nextSyntheticUuid(),
          profile_id: studentId,
          role: "student",
          faculty_id: department.faculty_id,
          department_id: department.id,
          created_at: createdAt,
        });
        db.studentCurriculumAssignments.push({
          id: assignmentId,
          student_id: studentId,
          curriculum_version_id: row.curriculum_version_id,
          start_date: "2026-11-10",
          end_date: null,
          change_note: "Initial curriculum assignment",
          created_at: createdAt,
        });
        importedByCurriculum.set(
          row.curriculum_version_id,
          (importedByCurriculum.get(row.curriculum_version_id) ?? 0) + 1,
        );
        db.studentOrganizations.push({
          student_id: studentId,
          student_curriculum_assignment_id: assignmentId,
          curriculum_version_id: row.curriculum_version_id,
          program_id: program.id,
          department_id: department.id,
          faculty_id: department.faculty_id,
          adviser_id: adviser.id,
          entry_year: row.entry_year ?? null,
        });
        db.adviserAssignments.push({
          id: nextSyntheticUuid(),
          student_id: studentId,
          adviser_id: adviser.id,
          adviser_name: adviser.full_name,
          adviser_email: adviser.email,
          adviser_faculty_name: null,
          adviser_consultation_hours: adviser.consultation_hours ?? null,
          start_date: "2026-11-10",
          end_date: null,
          handed_over_to_adviser_id: null,
          handed_over_to_name: null,
          handover_label: null,
          created_at: createdAt,
        });
      }
      db.curriculumVersions = db.curriculumVersions.map((version) => ({
        ...version,
        enrolled_student_count:
          version.enrolled_student_count +
          (importedByCurriculum.get(version.id) ?? 0),
      }));
    }

    const res: ApiSchema<"StudentBatchImportResponse"> = {
      mode: body.mode,
      valid_count: validCount,
      warning_count: 0,
      error_count: body.rows.length - validCount,
      imported_count: body.mode === "commit" ? validCount : 0,
      results: checks.map(({ row, error }) => ({
        row_number: row.row_number,
        student_number: row.student_number,
        email: row.email,
        outcome: error
          ? "error"
          : body.mode === "commit"
            ? "imported"
            : "valid",
        message: error ?? "Validated successfully.",
      })),
    };
    return HttpResponse.json(res, { status: 200 });
  }),

  // ===========================================================================
  // 8. Advising Plans, Notes, Remarks, Shift Preview, AI Assistant & Photos
  // ===========================================================================
  http.put(
    "*/functions/v1/students/:student_id/plans/:school_term_id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const schoolTermId = String(params.school_term_id);
      const db = getMockDatabase();
      const isAdmin = auth.persona.roles.includes("admin");
      if (
        !isAdmin &&
        !db.adviserAssignments.some(
          (item) =>
            item.student_id === studentId &&
            item.adviser_id === auth.persona.profileId &&
            item.end_date === null,
        )
      )
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser may save this plan.",
        );
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"AdvisingPlanSaveRequest"> | null;
      if (
        !body ||
        !Array.isArray(body.items) ||
        body.items.length > 200 ||
        !body.expected_curriculum_assignment_id ||
        !db.studentCurriculumAssignments.some(
          (item) =>
            item.id === body.expected_curriculum_assignment_id &&
            item.student_id === studentId &&
            item.end_date === null,
        ) ||
        body.items.some(
          (item) =>
            !db.courseOfferings.some(
              (offering) =>
                offering.id === item.course_offering_id &&
                offering.school_term_id === schoolTermId,
            ),
        )
      )
        return errorJson(
          400,
          "INVALID_INPUT",
          "The advising plan does not match the student, active curriculum assignment, or selected term.",
        );
      const oldPlan = db.advisingPlans.find(
        (item) =>
          item.student_id === studentId && item.school_term_id === schoolTermId,
      );
      if ((oldPlan?.revision ?? null) !== (body.expected_revision ?? null))
        return errorJson(
          409,
          "STALE_PLAN",
          "The advising plan changed since it was loaded.",
        );
      const now = new Date().toISOString();
      const plan: ApiSchema<"AdvisingPlan"> = {
        id: oldPlan?.id ?? nextSyntheticUuid(),
        student_id: studentId,
        school_term_id: schoolTermId,
        student_curriculum_assignment_id:
          body.expected_curriculum_assignment_id,
        created_by: oldPlan?.created_by ?? auth.persona.profileId,
        updated_by: auth.persona.profileId,
        created_at: oldPlan?.created_at ?? now,
        updated_at: now,
        revision: (oldPlan?.revision ?? 0) + 1,
      };
      if (oldPlan) db.advisingPlans[db.advisingPlans.indexOf(oldPlan)] = plan;
      else db.advisingPlans.push(plan);
      db.advisingPlanItems = db.advisingPlanItems.filter(
        (item) => item.advising_plan_id !== plan.id,
      );
      const items = body.items.map(
        (item, index): ApiSchema<"AdvisingPlanItem"> => ({
          id: nextSyntheticUuid(),
          advising_plan_id: plan.id,
          student_id: studentId,
          school_term_id: schoolTermId,
          course_offering_id: item.course_offering_id,
          curriculum_term_course_id: item.curriculum_term_course_id ?? null,
          display_order: index + 1,
          created_at: now,
        }),
      );
      db.advisingPlanItems.push(...items);
      return HttpResponse.json({ plan, items }, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/notes",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const db = getMockDatabase();
      const isAdmin = auth.persona.roles.includes("admin");
      if (
        !isAdmin &&
        !db.adviserAssignments.some(
          (assignment) =>
            assignment.student_id === studentId &&
            assignment.adviser_id === auth.persona.profileId &&
            assignment.end_date === null,
        )
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser or an administrator may add a note.",
        );
      }
      if (
        !db.studentOrganizations.some(
          (student) => student.student_id === studentId,
        )
      ) {
        return errorJson(
          404,
          "NOT_FOUND",
          "Student academic record not found.",
        );
      }
      const body: unknown = await request.json().catch(() => null);
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "body_text") ||
        typeof (body as { body_text?: unknown }).body_text !== "string" ||
        !(body as { body_text: string }).body_text.trim() ||
        (body as { body_text: string }).body_text.length > 8000
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "A valid body_text is required.",
        );
      }
      const createdAt = new Date().toISOString();
      const note: ApiSchema<"AdvisingNote"> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        authored_by: auth.persona.profileId,
        author_name: auth.persona.fullName,
        author_role_label: isAdmin ? "Administrator" : "Adviser",
        body_text: (body as { body_text: string }).body_text,
        is_archived: false,
        archived_at: null,
        archived_by: null,
        created_at: createdAt,
      };
      db.advisingNotes.push(note);
      db.notifications.push({
        id: nextSyntheticUuid(),
        recipient_id: studentId,
        kind: "note",
        event_type: "advising_note_added",
        title: "New advising note",
        body: "A note was added to your advising record.",
        target_route: "/student/dashboard",
        target_student_id: studentId,
        actor_id: auth.persona.profileId,
        entity_type: "advising_note",
        entity_id: note.id,
        dedupe_key: null,
        email_delivery_status: "pending",
        is_read: false,
        read_at: null,
        created_at: createdAt,
      });
      return HttpResponse.json(note, { status: 201 });
    },
  ),

  http.patch(
    "*/functions/v1/students/:student_id/notes/:note_id",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["admin", "adviser"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const noteId = String(params.note_id);
      const db = getMockDatabase();
      if (
        !auth.persona.roles.includes("admin") &&
        !db.adviserAssignments.some(
          (assignment) =>
            assignment.student_id === studentId &&
            assignment.adviser_id === auth.persona.profileId &&
            assignment.end_date === null,
        )
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Only the current adviser or an administrator may archive or restore a note.",
        );
      }
      const body: unknown = await request.json().catch(() => null);
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "is_archived") ||
        typeof (body as { is_archived?: unknown }).is_archived !== "boolean"
      ) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "A valid is_archived value is required.",
        );
      }
      const note = db.advisingNotes.find(
        (item) => item.id === noteId && item.student_id === studentId,
      );
      if (!note) return errorJson(404, "NOT_FOUND", "Advising note not found.");
      const archived = (body as { is_archived: boolean }).is_archived;
      const updated = {
        ...note,
        is_archived: archived,
        archived_at: archived ? "2026-11-10T09:00:00Z" : null,
        archived_by: archived ? auth.persona.profileId : null,
      };
      db.advisingNotes[db.advisingNotes.indexOf(note)] = updated;
      const student = db.profiles.find((item) => item.id === studentId);
      db.auditLogEntries.push({
        id: nextSyntheticUuid(),
        actor_id: auth.persona.profileId,
        actor_name: auth.persona.fullName,
        actor_role: auth.persona.primaryRole,
        student_id: studentId,
        student_name: student?.full_name ?? null,
        student_number: student?.student_number ?? null,
        target_label: student?.full_name ?? "Student note",
        action: archived ? "note_archived" : "note_restored",
        action_category: "note_change",
        entity_type: "advising_note",
        entity_id: noteId,
        details_summary: archived
          ? "Archived advising note."
          : "Restored advising note.",
        old_value: auditSnapshot({ is_archived: note.is_archived }),
        new_value: auditSnapshot({ is_archived: archived }),
        reason: null,
        created_at: new Date().toISOString(),
      });
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/remarks",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "dean",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const remark: ApiSchema<"AttemptRemark"> = {
        id: nextSyntheticUuid(),
        student_id: studentId,
        authored_by: auth.persona.profileId,
        body_text: String(body.body_text ?? "Adviser remark"),
        created_at: "2026-11-10T09:00:00Z",
        attempt_id:
          (body.attempt_id as string | null) ?? MOCK_IDS.attemptCsci102Inc,
        curriculum_term_course_id:
          (body.curriculum_term_course_id as string | null) ??
          MOCK_IDS.slotCsci102,
      };
      return HttpResponse.json(remark, { status: 201 });
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/shift-preview",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, [
        "admin",
        "department_head",
        "adviser",
      ]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (!canAccessStudentRecord(auth.persona, studentId, true))
        return errorJson(403, "INSUFFICIENT_PRIVILEGE", "Out of scope.");
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"ShiftPreviewRequest"> | null;
      const db = getMockDatabase();
      const org = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      const target = db.curriculumVersions.find(
        (item) =>
          item.id === body?.curriculum_version_id && item.status === "active",
      );
      if (!org || !target)
        return errorJson(
          404,
          "NOT_FOUND",
          "Student or active target curriculum not found.",
        );
      const targetSlots = db.curriculumTermCourses.filter((slot) =>
        db.curriculumTerms.some(
          (term) =>
            term.id === slot.curriculum_term_id &&
            term.curriculum_version_id === target.id,
        ),
      );
      const passed = db.attemptResults.filter(
        (attempt) =>
          attempt.student_id === studentId &&
          attempt.effective_status === "passed",
      );
      const passedCourses = new Set(
        passed
          .map(
            (attempt) =>
              db.courseOfferings.find(
                (offering) => offering.id === attempt.course_offering_id,
              )?.course_id,
          )
          .filter(Boolean),
      );
      const carried = targetSlots
        .filter((slot) => slot.course_id && passedCourses.has(slot.course_id))
        .reduce((sum, slot) => sum + slot.nominal_units, 0);
      const totalEarned = passed.reduce(
        (sum, attempt) => sum + attempt.units_attempted,
        0,
      );
      const grades = passed.filter((attempt) => attempt.final_grade != null);
      const gradeUnits = grades.reduce(
        (sum, attempt) => sum + attempt.units_attempted,
        0,
      );
      const projected = gradeUnits
        ? grades.reduce(
            (sum, attempt) =>
              sum + (attempt.final_grade ?? 0) * attempt.units_attempted,
            0,
          ) / gradeUnits
        : null;
      return HttpResponse.json(
        {
          carried_units: carried,
          lost_units: Math.max(0, totalEarned - carried),
          projected_gwa: projected,
          mutates_records: false,
        },
        { status: 200 },
      );
    },
  ),

  http.post(
    "*/functions/v1/students/:student_id/assistant",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["adviser"]);
      if ("response" in auth) return auth.response;
      const body: unknown = await request.json().catch(() => null);
      if (!isAdvisingAIRequest(body)) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "Enter a valid message and conversation history.",
        );
      }
      const studentId = String(params.student_id);
      const db = getMockDatabase();
      const student = db.profiles.find(
        (profile) =>
          profile.id === studentId &&
          (profile.role === "student" || profile.roles?.includes("student")),
      );
      if (!student) return errorJson(404, "NOT_FOUND", "Student not found.");
      const assigned = db.adviserAssignments.some(
        (assignment) =>
          assignment.student_id === studentId &&
          assignment.adviser_id === auth.persona.profileId,
      );
      if (!assigned)
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Student is not assigned to this adviser.",
        );
      const unresolved = db.attemptResults.filter(
        (attempt) =>
          attempt.student_id === studentId &&
          attempt.recorded_status === "inc" &&
          attempt.completion_grade == null,
      ).length;
      const res: ApiSchema<"AdvisingAIResponse"> = {
        answer: `Simulated response for ${student.full_name}: this sample record has ${unresolved} unresolved INC attempt${unresolved === 1 ? "" : "s"}. Review the student's official record before advising.`,
        verification_notice:
          "Verify all prerequisite and standing decisions against the official curriculum checklist.",
        grounded_at: "2026-11-10T09:00:00Z",
        mutates_records: false,
      };
      return HttpResponse.json(res, { status: 200 });
    },
  ),

  http.put(
    "*/functions/v1/students/:student_id/photo",
    async ({ request, params }) => {
      const auth = authenticateRequest(request, ["student", "admin"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (
        !auth.persona.roles.includes("admin") &&
        auth.persona.profileId !== studentId
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot update another student profile photo.",
        );
      }
      const body = (await request
        .json()
        .catch(() => null)) as ApiSchema<"StudentPhotoUpdateRequest"> | null;
      if (!body?.avatar_url || !body?.mime_type || !body?.file_size_bytes) {
        return errorJson(
          400,
          "INVALID_INPUT",
          "avatar_url, mime_type, and file_size_bytes are required.",
        );
      }
      if (body.file_size_bytes > 5_242_880) {
        return errorJson(
          400,
          "FILE_TOO_LARGE",
          "Profile photo must not exceed 5 MiB (5,242,880 bytes).",
        );
      }
      const db = getMockDatabase();
      const profile =
        db.profiles.find((p) => p.id === studentId) ?? db.profiles[0]!;
      const updated: ApiSchema<"Profile"> = {
        ...profile,
        avatar_url: body.avatar_url,
        updated_at: "2026-11-10T09:00:00Z",
      };
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  http.delete(
    "*/functions/v1/students/:student_id/photo",
    ({ request, params }) => {
      const auth = authenticateRequest(request, ["student", "admin"]);
      if ("response" in auth) return auth.response;
      const studentId = String(params.student_id);
      if (
        !auth.persona.roles.includes("admin") &&
        auth.persona.profileId !== studentId
      ) {
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Cannot remove another student profile photo.",
        );
      }
      const db = getMockDatabase();
      const profile =
        db.profiles.find((p) => p.id === studentId) ?? db.profiles[0]!;
      const updated: ApiSchema<"Profile"> = {
        ...profile,
        avatar_url: null,
        updated_at: "2026-11-10T09:00:00Z",
      };
      return HttpResponse.json(updated, { status: 200 });
    },
  ),

  // ===========================================================================
  // 9. Notifications, Reports, Settings & Audit Edge Functions
  // ===========================================================================
  http.post("*/functions/v1/notifications/mark-read", async ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const body = (await request.json().catch(() => ({
      mark_all: true,
      is_read: true,
    }))) as ApiSchema<"MarkNotificationsReadRequest">;
    const db = getMockDatabase();
    let updatedCount = 0;
    for (const n of db.notifications) {
      if (n.recipient_id === auth.persona.profileId) {
        if (
          body.mark_all ||
          body.notification_id === n.id ||
          body.notification_ids?.includes(n.id)
        ) {
          const isRead = body.is_read ?? true;
          db.notifications[db.notifications.indexOf(n)] = {
            ...n,
            is_read: isRead,
            read_at: isRead ? (n.read_at ?? "2026-11-10T10:00:00Z") : null,
          };
          updatedCount += 1;
        }
      }
    }
    const res: ApiSchema<"MarkNotificationsReadResponse"> = {
      updated_count: updatedCount,
    };
    return HttpResponse.json(res, { status: 200 });
  }),

  http.post(
    "*/functions/v1/notifications/evaluate-alerts",
    async ({ request }) => {
      const auth = authenticateRequest(request, ["admin", "department_head"]);
      if ("response" in auth) return auth.response;
      const body = (await request.json().catch(() => ({
        dry_run: false,
      }))) as ApiSchema<"EvaluateAlertsRequest">;
      const res: ApiSchema<"EvaluateAlertsResponse"> = {
        reference_date: body.reference_date ?? "2026-11-10",
        dry_run: Boolean(body.dry_run),
        evaluated_counts: {
          inc_deadline_approaching: 1,
          inc_lapsed: 0,
          standing_threshold_alert: 0,
          encoding_deadline_approaching: 0,
          unassigned_students_pending: 1,
          invitation_expiring_soon: 0,
          backup_overdue_reminder: 0,
          skipped_duplicates: 0,
          total_created: 2,
        },
        created_notifications: [],
      };
      return HttpResponse.json(res, { status: 200 });
    },
  ),

  http.get("*/functions/v1/reports/adviser-dashboard", ({ request }) => {
    const auth = authenticateRequest(request, [
      "admin",
      "dean",
      "department_head",
      "adviser",
    ]);
    if ("response" in auth) return auth.response;
    const db = getMockDatabase();
    const url = new URL(request.url);
    const adviserId =
      url.searchParams.get("adviser_id") ?? auth.persona.profileId;
    const selectedAdviser = db.profiles.find(
      (profile) => profile.id === adviserId,
    );
    if (!selectedAdviser)
      return errorJson(404, "NOT_FOUND", "Adviser not found.");
    if (adviserId !== auth.persona.profileId) {
      const inScope =
        auth.persona.roles.includes("admin") ||
        (auth.persona.roles.includes("dean") &&
          !!selectedAdviser.faculty_id &&
          canAccessFaculty(auth.persona, selectedAdviser.faculty_id)) ||
        (auth.persona.roles.includes("department_head") &&
          !!selectedAdviser.department_id &&
          canAccessDepartment(auth.persona, selectedAdviser.department_id));
      if (!inScope)
        return errorJson(
          403,
          "INSUFFICIENT_PRIVILEGE",
          "Adviser is outside your scope.",
        );
    }
    const studentIds = [
      ...new Set(
        db.adviserAssignments
          .filter(
            (assignment) =>
              assignment.adviser_id === adviserId &&
              assignment.end_date === null,
          )
          .map((assignment) => assignment.student_id),
      ),
    ];
    const attempts = db.attemptResults.filter((attempt) =>
      studentIds.includes(attempt.student_id),
    );
    const studentMetrics = studentIds.map((studentId) => {
      const counted = markRetakeResults(
        attempts.filter((attempt) => attempt.student_id === studentId),
      )
        .filter((attempt) => attempt.counts_toward_cumulative_gwa)
        .map((attempt) => ({
          grade:
            attempt.completion_grade ??
            attempt.final_grade ??
            (attempt.is_lapsed_inc ? 5 : null),
          units: attempt.units_attempted,
        }))
        .filter((item) => item.grade !== null && item.units > 0);
      const units = counted.reduce((sum, item) => sum + item.units, 0);
      const failedUnits = counted
        .filter((item) => item.grade! > 3)
        .reduce((sum, item) => sum + item.units, 0);
      const organization = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      const settings = db.systemSettings.find(
        (item) => item.department_id === organization?.department_id,
      );
      const failurePct = units ? (failedUnits * 100) / units : 0;
      const standing =
        settings && failurePct >= settings.dismissal_pct
          ? "dismissed"
          : settings && failurePct >= settings.probation_pct
            ? "probation"
            : settings && failurePct >= settings.warning_pct
              ? "warning"
              : "good_standing";
      return {
        gwa: units
          ? counted.reduce((sum, item) => sum + item.grade! * item.units, 0) /
            units
          : null,
        standing,
      };
    });
    const gwas = studentMetrics
      .map((metric) => metric.gwa)
      .filter((value): value is number => value !== null);
    const batches = new Map<
      string,
      { row: ApiSchema<"BatchCurriculumGwaRow">; grades: number[] }
    >();
    studentIds.forEach((studentId, index) => {
      const organization = db.studentOrganizations.find(
        (item) => item.student_id === studentId,
      );
      const curriculum = db.curriculumVersions.find(
        (item) => item.id === organization?.curriculum_version_id,
      );
      const program = db.programs.find(
        (item) => item.id === organization?.program_id,
      );
      if (!organization?.entry_year || !curriculum || !program) return;
      const key = `${organization.entry_year}:${curriculum.id}`;
      const batch = batches.get(key) ?? {
        row: {
          entry_year: organization.entry_year,
          program_id: program.id,
          program_code: program.code,
          curriculum_version_id: curriculum.id,
          curriculum_label: curriculum.version_label,
          student_count: 0,
          mean_gwa: null,
          good_standing_count: 0,
          at_risk_count: 0,
        },
        grades: [],
      };
      batch.row.student_count += 1;
      const metric = studentMetrics[index];
      if (metric?.standing === "good_standing")
        batch.row.good_standing_count += 1;
      else batch.row.at_risk_count += 1;
      const grade = metric?.gwa;
      if (grade != null) batch.grades.push(grade);
      batch.row.mean_gwa = batch.grades.length
        ? Number(
            (
              batch.grades.reduce((sum, value) => sum + value, 0) /
              batch.grades.length
            ).toFixed(2),
          )
        : null;
      batches.set(key, batch);
    });
    const termId = url.searchParams.get("school_term_id");
    const termAttempts = termId
      ? attempts.filter((attempt) =>
          db.courseOfferings.some(
            (offering) =>
              offering.id === attempt.course_offering_id &&
              offering.school_term_id === termId,
          ),
        )
      : attempts;
    const graded = termAttempts
      .map((attempt) => attempt.completion_grade ?? attempt.final_grade)
      .filter(
        (grade): grade is number => grade !== null && grade !== undefined,
      );
    const bands = [
      { label: "1.00–1.50", min_grade: 1, max_grade: 1.5 },
      { label: "1.75–2.25", min_grade: 1.75, max_grade: 2.25 },
      { label: "2.50–3.00", min_grade: 2.5, max_grade: 3 },
      { label: "5.00", min_grade: 5, max_grade: 5 },
    ];
    const pendingInc = attempts.filter(
      (attempt) =>
        attempt.recorded_status === "inc" &&
        attempt.completion_grade == null &&
        !attempt.is_lapsed_inc,
    ).length;
    const report: ApiSchema<"AdviserDashboardReport"> = {
      adviser_id: adviserId,
      total_advisees: studentIds.length,
      standing_counts: {
        good_standing: studentMetrics.filter(
          (metric) => metric.standing === "good_standing",
        ).length,
        warning: studentMetrics.filter(
          (metric) => metric.standing === "warning",
        ).length,
        probation: studentMetrics.filter(
          (metric) => metric.standing === "probation",
        ).length,
        dismissed: studentMetrics.filter(
          (metric) => metric.standing === "dismissed",
        ).length,
      },
      open_grade_flags_count: db.gradeFlags.filter(
        (flag) =>
          studentIds.includes(flag.student_id) && flag.status === "open",
      ).length,
      pending_inc_count: pendingInc,
      expiring_inc_soon_count: 0,
      lapsed_inc_count: attempts.filter((attempt) => attempt.is_lapsed_inc)
        .length,
      mean_gwa: gwas.length
        ? Number(
            (gwas.reduce((sum, value) => sum + value, 0) / gwas.length).toFixed(
              2,
            ),
          )
        : null,
      grade_distribution: {
        total_graded: graded.length,
        inc_count: termAttempts.filter(
          (attempt) =>
            attempt.recorded_status === "inc" &&
            attempt.completion_grade == null,
        ).length,
        dr_count: termAttempts.filter(
          (attempt) => attempt.effective_status === "dr",
        ).length,
        na_count: termAttempts.filter(
          (attempt) => attempt.effective_status === "na",
        ).length,
        currently_enrolled_count: termAttempts.filter(
          (attempt) => attempt.effective_status === "currently_enrolled",
        ).length,
        buckets: bands.map((band) => {
          const count = graded.filter(
            (grade) => grade >= band.min_grade && grade <= band.max_grade,
          ).length;
          return {
            ...band,
            count,
            percentage: graded.length
              ? Number(((count * 100) / graded.length).toFixed(2))
              : 0,
          };
        }),
      },
      batch_curriculum_gwa: [...batches.values()].map((batch) => batch.row),
      advisees_with_deficiencies: studentIds
        .map((id) => deficiencySummary(id))
        .filter(
          (item): item is ApiSchema<"DeficiencyStudentSummary"> =>
            item !== null,
        ),
      computed_at: "2026-11-10T09:00:00Z",
    };
    return HttpResponse.json(report, { status: 200 });
  }),

  http.get("*/functions/v1/reports/department", ({ request }) => {
    const auth = authenticateRequest(request, ["admin", "department_head"]);
    if ("response" in auth) return auth.response;
    const db = getMockDatabase();
    const query = new URL(request.url).searchParams;
    const departmentId =
      query.get("department_id") ??
      auth.persona.departmentId ??
      MOCK_IDS.deptDcst;
    if (
      !auth.persona.roles.includes("admin") &&
      !canAccessDepartment(auth.persona, departmentId)
    )
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Department is out of scope.",
      );
    const programId = query.get("program_id");
    const orgs = db.studentOrganizations.filter(
      (item) =>
        item.department_id === departmentId &&
        (!programId || item.program_id === programId),
    );
    const metrics = orgs.map((item) =>
      studentMetrics(item.student_id, item.department_id),
    );
    const ids = new Set(orgs.map((item) => item.student_id));
    const grades = metrics
      .map((item) => item.gwa)
      .filter((value): value is number => value !== null);
    const standingCounts = {
      good_standing: metrics.filter((item) => item.standing === "good_standing")
        .length,
      warning: metrics.filter((item) => item.standing === "warning").length,
      probation: metrics.filter((item) => item.standing === "probation").length,
      dismissed: metrics.filter((item) => item.standing === "dismissed").length,
    };
    const caseloads = db.adviserAssignments.filter(
      (item) => ids.has(item.student_id) && item.end_date === null,
    );
    const adviserIds = [...new Set(caseloads.map((item) => item.adviser_id))];
    const attempts = db.attemptResults.filter(
      (item) =>
        ids.has(item.student_id) &&
        (!query.get("school_term_id") ||
          db.courseOfferings.some(
            (offering) =>
              offering.id === item.course_offering_id &&
              offering.school_term_id === query.get("school_term_id"),
          )),
    );
    const report: ApiSchema<"DepartmentReport"> = {
      department_id: departmentId,
      total_students: orgs.length,
      with_deficiencies_count: metrics.filter(
        (item) =>
          item.failed.length +
            item.openInc.length +
            item.lapsed.length +
            item.flags.length >
          0,
      ).length,
      unassigned_students_count: orgs.filter(
        (item) =>
          !caseloads.some(
            (assignment) => assignment.student_id === item.student_id,
          ),
      ).length,
      open_grade_flags_count: db.gradeFlags.filter(
        (item) => ids.has(item.student_id) && item.status === "open",
      ).length,
      pending_transfers_count: db.curriculumTransferRequests.filter(
        (item) => ids.has(item.student_id) && item.status === "pending",
      ).length,
      average_gwa: grades.length
        ? Number(
            (
              grades.reduce((sum, grade) => sum + grade, 0) / grades.length
            ).toFixed(2),
          )
        : null,
      standing_counts: standingCounts,
      adviser_caseloads: adviserIds.map((id) => ({
        adviser_id: id,
        adviser_name:
          db.profiles.find((profile) => profile.id === id)?.full_name ??
          "Unknown adviser",
        student_count: caseloads.filter((item) => item.adviser_id === id)
          .length,
        at_risk_count: caseloads.filter(
          (item) =>
            item.adviser_id === id &&
            studentMetrics(item.student_id, departmentId).standing !==
              "good_standing",
        ).length,
      })),
      at_risk_roster: orgs
        .map((item) => deficiencySummary(item.student_id))
        .filter(
          (item): item is ApiSchema<"DeficiencyStudentSummary"> =>
            item !== null,
        ),
      bottleneck_courses: db.courses.flatMap((course) => {
        const courseAttempts = attempts.filter((item) =>
          db.courseOfferings.some(
            (offering) =>
              offering.id === item.course_offering_id &&
              offering.course_id === course.id,
          ),
        );
        const affected = courseAttempts.filter(
          (item) =>
            item.effective_status === "failed" ||
            item.effective_status === "inc",
        );
        return affected.length
          ? [
              {
                course_id: course.id,
                code: course.code,
                title: course.title,
                affected_count: affected.length,
                fail_or_inc_rate: Number(
                  ((affected.length * 100) / courseAttempts.length).toFixed(2),
                ),
              },
            ]
          : [];
      }),
      computed_at: "2026-11-10T09:00:00Z",
    };
    return HttpResponse.json(report);
  }),

  http.get("*/functions/v1/reports/faculty", ({ request }) => {
    const auth = authenticateRequest(request, ["admin", "dean"]);
    if ("response" in auth) return auth.response;
    const db = getMockDatabase();
    const url = new URL(request.url);
    const facultyId =
      url.searchParams.get("faculty_id") ??
      auth.persona.facultyId ??
      MOCK_IDS.facultyComputing;
    if (
      !auth.persona.roles.includes("admin") &&
      !canAccessFaculty(auth.persona, facultyId)
    )
      return errorJson(
        403,
        "INSUFFICIENT_PRIVILEGE",
        "Faculty is out of scope.",
      );
    const departmentFilter = url.searchParams.get("department_id");
    const facultyDepts = db.departments.filter(
      (d) => d.faculty_id === facultyId,
    );
    const orgs = db.studentOrganizations.filter(
      (org) =>
        org.faculty_id === facultyId &&
        (!departmentFilter || org.department_id === departmentFilter),
    );
    const metrics = orgs.map((org) => ({
      org,
      ...studentMetrics(org.student_id, org.department_id),
    }));
    const gwas = metrics
      .map((m) => m.gwa)
      .filter((value): value is number => value !== null);
    const averageGwa = gwas.length
      ? Number((gwas.reduce((sum, g) => sum + g, 0) / gwas.length).toFixed(2))
      : 0;

    const departmentSummaries: ApiSchema<"FacultyReport">["department_summaries"] =
      facultyDepts
        .filter((dept) => !departmentFilter || dept.id === departmentFilter)
        .map((dept) => {
          const deptMetrics = metrics.filter(
            (m) => m.org.department_id === dept.id,
          );
          const deptGwas = deptMetrics
            .map((m) => m.gwa)
            .filter((value): value is number => value !== null);
          return {
            department_id: dept.id,
            department_name: dept.name,
            student_count: deptMetrics.length,
            average_gwa: deptGwas.length
              ? Number(
                  (
                    deptGwas.reduce((sum, g) => sum + g, 0) / deptGwas.length
                  ).toFixed(2),
                )
              : 0,
            at_risk_count: deptMetrics.filter(
              (m) => m.isDelinquent || m.flags.length > 0,
            ).length,
          };
        });

    const report: ApiSchema<"FacultyReport"> = {
      faculty_id: facultyId,
      total_students: metrics.length,
      with_deficiencies_count: metrics.filter(
        (m) =>
          m.failed.length +
            m.openInc.length +
            m.lapsed.length +
            m.flags.length >
          0,
      ).length,
      average_gwa: averageGwa,
      standing_counts: {
        good_standing: metrics.filter((m) => m.standing === "good_standing")
          .length,
        warning: metrics.filter((m) => m.standing === "warning").length,
        probation: metrics.filter((m) => m.standing === "probation").length,
        dismissed: metrics.filter((m) => m.standing === "dismissed").length,
      },
      open_inc_count: metrics.reduce((sum, m) => sum + m.openInc.length, 0),
      at_risk_total_count: metrics.filter(
        (m) => m.isDelinquent || m.flags.length > 0,
      ).length,
      encoding_progress_pct: 85,
      at_risk_roster: metrics
        .map((m) =>
          deficiencySummary(
            m.org.student_id,
            m.isDelinquent || m.flags.length > 0,
          ),
        )
        .filter(
          (item): item is ApiSchema<"DeficiencyStudentSummary"> =>
            item !== null,
        ),
      department_summaries: departmentSummaries,
      computed_at: "2026-11-10T09:00:00Z",
    };
    return HttpResponse.json(report);
  }),

  http.put("*/functions/v1/settings", async ({ request }) => {
    const auth = authenticateRequest(request, ["admin", "department_head"]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => ({}))) as ApiSchema<"SystemSettingsUpdateRequest">;
    const db = getMockDatabase();
    const departmentId = auth.persona.roles.includes("admin")
      ? null
      : (body.department_id ?? auth.persona.departmentId);
    const settingsIndex = db.systemSettings.findIndex(
      (setting) => setting.department_id === departmentId,
    );
    if (settingsIndex === -1) {
      return errorJson(404, "NOT_FOUND", "System settings were not found.");
    }
    const current = db.systemSettings[settingsIndex]!;
    const warning = body.warning_pct ?? current.warning_pct;
    const probation = body.probation_pct ?? current.probation_pct;
    const dismissal = body.dismissal_pct ?? current.dismissal_pct;
    if (!(
      warning > 0 &&
      warning < probation &&
      probation < dismissal &&
      dismissal <= 100
    )) {
      return errorJson(
        400,
        "INVALID_THRESHOLDS",
        "Thresholds must satisfy 0 < warning_pct < probation_pct < dismissal_pct <= 100.",
      );
    }
    const updated: ApiSchema<"SystemSettings"> = {
      ...current,
      warning_pct: warning,
      probation_pct: probation,
      dismissal_pct: dismissal,
      sender_email: body.sender_email ?? current.sender_email,
      updated_at: "2026-11-10T09:00:00Z",
    };
    db.systemSettings[settingsIndex] = updated;
    recordMockAudit(auth.persona, {
      action: "settings_updated",
      entityType: "system_settings",
      entityId: updated.id,
      label: "Department settings",
      details: "Updated department settings.",
    });
    return HttpResponse.json(updated, { status: 200 });
  }),

  http.post("*/functions/v1/settings/record-backup", async ({ request }) => {
    const auth = authenticateRequest(request, ["admin", "department_head"]);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => ({}))) as ApiSchema<"RecordBackupRequest">;
    const db = getMockDatabase();
    const departmentId = auth.persona.roles.includes("admin")
      ? null
      : (body.department_id ?? auth.persona.departmentId);
    const settingsIndex = db.systemSettings.findIndex(
      (setting) => setting.department_id === departmentId,
    );
    if (settingsIndex === -1) {
      return errorJson(404, "NOT_FOUND", "System settings were not found.");
    }
    const current = db.systemSettings[settingsIndex]!;
    const updated: ApiSchema<"SystemSettings"> = {
      ...current,
      last_backup_at: body.completed_at ?? "2026-11-10T09:00:00Z",
      last_backup_by: auth.persona.profileId,
      last_backup_reference: body.backup_reference ?? "BKP-2026-11-10-001",
      last_backup_location:
        body.storage_location ?? "vsu-saais-backups/2026-11-10.dump",
      last_backup_scope:
        body.scope ??
        (auth.persona.roles.includes("admin")
          ? "institution_wide"
          : "department_records"),
      updated_at: "2026-11-10T09:00:00Z",
    };
    db.systemSettings[settingsIndex] = updated;
    recordMockAudit(auth.persona, {
      action: "backup_recorded",
      entityType: "system_settings",
      entityId: updated.id,
      label: "Backup record",
      details: `Recorded backup ${updated.last_backup_reference ?? ""}.`.trim(),
    });
    return HttpResponse.json(updated, { status: 200 });
  }),

  http.post("*/functions/v1/audit/view-event", async ({ request }) => {
    const auth = authenticateRequest(request);
    if ("response" in auth) return auth.response;
    const body = (await request
      .json()
      .catch(() => null)) as ApiSchema<"AuditViewEventRequest"> | null;
    if (!body?.event_type) {
      return errorJson(400, "INVALID_INPUT", "event_type is required.");
    }
    const entityType = body.report_type ?? "student_record";
    const entry: ApiSchema<"AuditLogEntry"> = {
      id: nextSyntheticUuid(),
      actor_id: auth.persona.profileId,
      actor_name: auth.persona.fullName,
      actor_role: auth.persona.primaryRole,
      student_id: body.student_id ?? null,
      student_name: body.student_id ? MOCK_PERSONAS.student.fullName : null,
      student_number: body.student_id ? "24-1-00101" : null,
      target_label: body.details ?? entityType,
      action: body.event_type,
      action_category: body.event_type.includes("export") ? "export" : "view",
      entity_type: entityType,
      entity_id: body.student_id ?? null,
      details_summary: body.details ?? `Recorded ${body.event_type}`,
      old_value: null,
      new_value: null,
      reason: null,
      created_at: "2026-11-10T09:00:00Z",
    };
    getMockDatabase().auditLogEntries.push(entry);
    return HttpResponse.json(entry, { status: 201 });
  }),
];
