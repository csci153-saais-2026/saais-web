import type { AuditEvent } from "./audit-data"

export type AuditFilters = {
  person: string
  student: string
  action: string
  from: string
  to: string
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = { person: "", student: "", action: "all", from: "", to: "" }

/** Date filters use Philippine calendar dates, including both boundary days. */
export function auditDate(timestamp: string): string {
  return new Date(new Date(timestamp).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function filterAuditEvents(events: AuditEvent[], filters: AuditFilters): AuditEvent[] {
  if (filters.from && filters.to && filters.from > filters.to) return []
  const person = filters.person.trim().toLowerCase()
  const student = filters.student.trim().toLowerCase()
  return events.filter((event) => {
    const subject = `${event.studentName ?? ""} ${event.studentNumber ?? ""}`.toLowerCase()
    const date = auditDate(event.timestamp)
    return event.person.toLowerCase().includes(person)
      && subject.includes(student)
      && (filters.action === "all" || event.action === filters.action)
      && (!filters.from || date >= filters.from)
      && (!filters.to || date <= filters.to)
  }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}
