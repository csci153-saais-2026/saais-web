import type { ApiSchema } from "@/lib/api/types"

export interface PdfReportUnit {
  readonly prefix: string
  readonly name: string
}

export interface PdfReportSignatory {
  readonly role: string
  readonly name: string
}

export interface PdfReportStat {
  readonly label: string
  readonly value: string
  readonly note?: string
}

export interface PdfReportSection {
  readonly title: string
  readonly headers: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

export interface PdfReportPayload {
  readonly title: string
  readonly unit: PdfReportUnit
  readonly info: readonly (readonly [string, string])[]
  readonly stats: readonly PdfReportStat[]
  readonly sections: readonly PdfReportSection[]
  readonly signatories: readonly PdfReportSignatory[]
  readonly footer: string
}

export interface StudentReportContextInput {
  readonly studentName?: string | null
  readonly studentNumber?: string | null
  readonly programLabel?: string | null
  readonly curriculumLabel?: string | null
  readonly adviserName?: string | null
  readonly departmentHeadName?: string | null
  readonly department?: Partial<ApiSchema<"Department">> | null
  readonly faculty?: Partial<ApiSchema<"Faculty">> | null
  readonly generatedOn?: string | Date | null
  readonly generatedByName?: string | null
}

export interface ChecklistReportSlotInput {
  readonly code: string
  readonly title: string
  readonly requiredUnits: number
  readonly earnedUnits: number
  readonly status: ApiSchema<"ChecklistSlotResult">["status"]
  readonly finalGrade?: number | string | null
  readonly isLapsedInc?: boolean
}

export interface ChecklistReportTermSectionInput {
  readonly title: string
  readonly slots: readonly ChecklistReportSlotInput[]
}

export interface FormatChecklistReportInput extends StudentReportContextInput {
  readonly sections: readonly ChecklistReportTermSectionInput[]
  readonly earnedUnits?: number
  readonly requiredUnits?: number
}

export type GradeSummaryAttemptInput = Pick<
  ApiSchema<"AttemptResult">,
  | "recorded_status"
  | "effective_status"
  | "midterm_status"
  | "midterm_grade"
  | "final_grade"
  | "completion_grade"
  | "units_attempted"
  | "is_lapsed_inc"
> & {
  readonly code?: string | null
  readonly course_code?: string | null
  readonly title?: string | null
  readonly course_title?: string | null
  readonly units?: number | null
}

export interface GradeSummaryTermInput {
  readonly school_year?: string
  readonly term_type?: string
  readonly title?: string
  readonly subtitle?: string | null
  readonly gwa?: number | null
  readonly attempts: readonly GradeSummaryAttemptInput[]
}

export interface FormatGradeSummaryReportInput extends StudentReportContextInput {
  readonly terms: readonly GradeSummaryTermInput[]
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export function formatTwoDecimalGrade(
  value: number | string | null | undefined,
  emptyFallback = "—"
): string {
  if (value === null || value === undefined || value === "") {
    return emptyFallback
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(2) : emptyFallback
  }
  const trimmed = value.trim()
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed).toFixed(2)
  }
  return trimmed
}

export function formatReportStatusLabel(
  status: ApiSchema<"ChecklistSlotResult">["status"] | ApiSchema<"AttemptStatus">,
  isLapsedInc = false
): string {
  if (isLapsedInc && (status === "inc" || status === "failed")) {
    return "INC lapsed"
  }
  switch (status) {
    case "passed":
      return "Passed"
    case "failed":
      return "Failed"
    case "inc":
      return "INC"
    case "currently_enrolled":
      return "Enrolled"
    case "dr":
      return "Dropped"
    case "na":
      return "No attendance"
    case "not_taken":
    default:
      return "Not taken"
  }
}

function formatReportDate(dateInput?: string | Date | null): string {
  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    const day = dateInput.getUTCDate()
    const month = SHORT_MONTHS[dateInput.getUTCMonth()]
    const year = dateInput.getUTCFullYear()
    return `${day} ${month} ${year}`
  }
  if (typeof dateInput === "string" && dateInput.trim().length > 0) {
    const trimmed = dateInput.trim()
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed)
    if (isoMatch) {
      const year = Number(isoMatch[1])
      const month = SHORT_MONTHS[Number(isoMatch[2]) - 1]
      const day = Number(isoMatch[3])
      if (month) return `${day} ${month} ${year}`
    }
    return trimmed
  }
  const now = new Date()
  return `${now.getDate()} ${SHORT_MONTHS[now.getMonth()]} ${now.getFullYear()}`
}

function buildLetterheadUnit(input: StudentReportContextInput): PdfReportUnit {
  const deptPrefix = input.department?.letterhead_prefix?.trim()
  const deptName =
    input.department?.letterhead_name?.trim() || input.department?.name?.trim()
  if (deptPrefix || deptName) {
    return {
      prefix: deptPrefix || "Department of",
      name: deptName || "Computer Science and Technology",
    }
  }

  const facPrefix = input.faculty?.letterhead_prefix?.trim()
  const facName =
    input.faculty?.letterhead_name?.trim() || input.faculty?.name?.trim()
  if (facPrefix || facName) {
    return {
      prefix: facPrefix || "Faculty of",
      name: facName || "Computing",
    }
  }

  return {
    prefix: "Department of",
    name: "Computer Science and Technology",
  }
}

function buildStudentInfoPairs(
  input: StudentReportContextInput
): readonly (readonly [string, string])[] {
  return [
    ["Name", input.studentName?.trim() || "—"],
    ["Student no.", input.studentNumber?.trim() || "—"],
    ["Program", input.programLabel?.trim() || "—"],
    ["Curriculum", input.curriculumLabel?.trim() || "—"],
    ["Adviser", input.adviserName?.trim() || "—"],
  ]
}

function buildSignatories(
  input: StudentReportContextInput
): readonly PdfReportSignatory[] {
  const adviserName = input.adviserName?.trim() || ""
  const headName =
    input.departmentHeadName?.trim() ||
    input.department?.department_head_name?.trim() ||
    ""
  return [
    { role: "Prepared by: Academic Adviser", name: adviserName },
    { role: "Noted by: Department Head", name: headName },
  ]
}

function buildStudentFooter(input: StudentReportContextInput): string {
  const dateText = formatReportDate(input.generatedOn)
  const actorName = input.generatedByName?.trim() || input.studentName?.trim()
  const byClause = actorName ? ` by ${actorName}` : ""
  return `Not an official record | Generated ${dateText}${byClause} through SAAIS`
}

/**
 * Pure formatter producing the structured PDF report payload for the Student Curriculum Checklist.
 */
export function formatChecklistReport(
  input: FormatChecklistReportInput
): PdfReportPayload {
  let computedEarned = 0
  let computedRequired = 0

  const sections: PdfReportSection[] = input.sections.map((section) => {
    const rows = section.slots.map((slot) => {
      computedEarned += slot.earnedUnits
      computedRequired += slot.requiredUnits
      const gradeStr =
        slot.finalGrade != null && slot.finalGrade !== ""
          ? formatTwoDecimalGrade(slot.finalGrade, "")
          : ""
      const statusLabel = formatReportStatusLabel(slot.status, slot.isLapsedInc)
      return [
        slot.code,
        slot.title,
        String(slot.requiredUnits),
        gradeStr,
        statusLabel,
      ] as const
    })

    return {
      title: section.title,
      headers: ["Code", "Title", "Units", "Grade", "Status"],
      rows,
    }
  })

  const totalEarned = input.earnedUnits ?? computedEarned
  const totalRequired = input.requiredUnits ?? computedRequired

  return {
    title: "Program checklist",
    unit: buildLetterheadUnit(input),
    info: buildStudentInfoPairs(input),
    stats: [
      {
        label: "Units earned",
        value: `${totalEarned} of ${totalRequired}`,
      },
    ],
    sections,
    signatories: buildSignatories(input),
    footer: buildStudentFooter(input),
  }
}

function formatMidtermColumn(attempt: GradeSummaryAttemptInput): string {
  if (attempt.midterm_status === "dr") return "DR"
  if (attempt.midterm_grade != null) {
    return formatTwoDecimalGrade(attempt.midterm_grade)
  }
  return "—"
}

function isAttemptLapsedInc(attempt: GradeSummaryAttemptInput): boolean {
  if (attempt.completion_grade != null) return false
  return Boolean(
    attempt.is_lapsed_inc ||
      (attempt.recorded_status === "inc" &&
        attempt.effective_status === "failed")
  )
}

function formatFinalOrCompletionColumn(attempt: GradeSummaryAttemptInput): string {
  if (attempt.completion_grade != null) {
    return `${formatTwoDecimalGrade(attempt.completion_grade)} (INC)`
  }
  if (isAttemptLapsedInc(attempt)) {
    return "INC (5.00)"
  }
  if (attempt.recorded_status === "inc") return "INC"
  if (attempt.recorded_status === "dr") return "DR"
  if (attempt.recorded_status === "na") return "NA"
  if (attempt.final_grade != null) {
    return formatTwoDecimalGrade(attempt.final_grade)
  }
  return "—"
}

function resolveAttemptStatusLabel(attempt: GradeSummaryAttemptInput): string {
  return formatReportStatusLabel(
    attempt.effective_status,
    isAttemptLapsedInc(attempt)
  )
}

function buildTermSectionTitle(term: GradeSummaryTermInput): string {
  const baseTitle =
    term.title?.trim() ||
    [term.school_year?.trim(), term.term_type?.trim()].filter(Boolean).join(" · ") ||
    "School term"

  if (term.subtitle && term.subtitle.trim().length > 0) {
    return `${baseTitle} | ${term.subtitle.trim()}`
  }
  if (term.gwa !== undefined) {
    const gwaStr = term.gwa != null ? formatTwoDecimalGrade(term.gwa) : "—"
    return `${baseTitle} | Term GWA ${gwaStr}`
  }
  return baseTitle
}

/**
 * Pure formatter producing the structured PDF report payload for the Student Grade Summary.
 */
export function formatGradeSummaryReport(
  input: FormatGradeSummaryReportInput
): PdfReportPayload {
  const sections: PdfReportSection[] = input.terms.map((term) => {
    const rows = term.attempts.map((attempt) => {
      const code = attempt.code ?? attempt.course_code ?? "—"
      const title = attempt.title ?? attempt.course_title ?? "—"
      const units = attempt.units ?? attempt.units_attempted
      return [
        code,
        title,
        String(units),
        formatMidtermColumn(attempt),
        formatFinalOrCompletionColumn(attempt),
        resolveAttemptStatusLabel(attempt),
      ] as const
    })

    return {
      title: buildTermSectionTitle(term),
      headers: [
        "Code",
        "Title",
        "Units",
        "Midterm",
        "Final / completion",
        "Status",
      ],
      rows,
    }
  })

  return {
    title: "Grade summary",
    unit: buildLetterheadUnit(input),
    info: buildStudentInfoPairs(input),
    stats: [],
    sections,
    signatories: buildSignatories(input),
    footer: buildStudentFooter(input),
  }
}
