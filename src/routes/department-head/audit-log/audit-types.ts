export type AuditAction = "View" | "Change" | "Sign-in"

export type AuditEvent = {
  id: string
  timestamp: string
  person: string
  action: AuditAction
  studentName?: string
  studentNumber?: string
  record: string
  details: string
}
