import type { DirectoryStudent } from "../shared/students-data"

export type ReassignmentInput = {
  studentIds: string[]
  adviser: string
  effectiveDate: string
  reason: string
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Local preview rules. Production reassignment must use the team's atomic backend operation. */
export function applyReassignment(
  students: DirectoryStudent[],
  input: ReassignmentInput,
  today: string,
): DirectoryStudent[] {
  const ids = new Set(input.studentIds)
  const adviser = input.adviser.trim()
  const reason = input.reason.trim()
  if (ids.size === 0) throw new Error("Select at least one student to reassign.")
  if (students.filter((student) => ids.has(student.id)).length !== ids.size) {
    throw new Error("A selected student is no longer in the directory. Select the students again.")
  }
  if (!adviser) throw new Error("Choose the new adviser.")
  if (!isCalendarDate(input.effectiveDate)) throw new Error("Choose a valid effective date.")
  if (!reason) throw new Error("Add a reason for the reassignment.")

  const changing = students.filter((student) => ids.has(student.id) && student.adviser !== adviser)
  if (changing.length === 0) throw new Error("Choose a different adviser for at least one selected student.")
  if (changing.some((student) => student.adviserSince && input.effectiveDate < student.adviserSince)) {
    throw new Error("The effective date cannot precede a selected student's current assignment.")
  }
  if (changing.some((student) => student.scheduledAssignment)) {
    throw new Error("A selected student already has a scheduled reassignment. Review it before making another change.")
  }

  return students.map((student) => {
    if (!ids.has(student.id) || student.adviser === adviser) return student
    if (input.effectiveDate > today) {
      return { ...student, scheduledAssignment: { adviser, effectiveDate: input.effectiveDate, reason } }
    }
    return {
      ...student,
      previousAdviser: student.adviser,
      adviser,
      adviserSince: input.effectiveDate,
      scheduledAssignment: undefined,
    }
  })
}

export function assignmentDateLabel(value?: string) {
  if (!value || !isCalendarDate(value)) return "—"
  return new Intl.DateTimeFormat("en-PH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila" })
    .format(new Date(`${value}T00:00:00Z`))
}
