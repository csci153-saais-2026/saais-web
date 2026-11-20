import type { DirectoryStudent } from "../shared/students-types"

export type ReassignmentInput = {
  studentIds: string[]
  adviserId: string
  effectiveDate: string
  reason: string
}

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Client-side checks for the reassignment form; the API enforces the same rules authoritatively. */
export function validateReassignment(students: DirectoryStudent[], input: ReassignmentInput, adviserName: string) {
  const ids = new Set(input.studentIds)
  if (ids.size === 0) throw new Error("Select at least one student to reassign.")
  const selected = students.filter((student) => ids.has(student.id))
  if (selected.length !== ids.size) throw new Error("A selected student is no longer in the directory. Select the students again.")
  if (!input.adviserId) throw new Error("Choose the new adviser.")
  if (!isCalendarDate(input.effectiveDate)) throw new Error("Choose a valid effective date.")
  if (!input.reason.trim()) throw new Error("Add a reason for the reassignment.")
  const changing = selected.filter((student) => student.adviser !== adviserName)
  if (changing.length === 0) throw new Error("Choose a different adviser for at least one selected student.")
  if (changing.some((student) => student.adviserSince && input.effectiveDate < student.adviserSince)) {
    throw new Error("The effective date cannot precede a selected student's current assignment.")
  }
  if (changing.some((student) => student.scheduledAssignment)) {
    throw new Error("A selected student already has a scheduled reassignment. Review it before making another change.")
  }
  return changing.length
}

export function assignmentDateLabel(value?: string) {
  if (!value || !isCalendarDate(value)) return "—"
  return new Intl.DateTimeFormat("en-PH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila" })
    .format(new Date(`${value}T00:00:00Z`))
}
