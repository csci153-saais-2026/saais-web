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

export const SAMPLE_AUDIT_EVENTS: AuditEvent[] = [
  { id: "audit-1", timestamp: "2025-08-15T10:42:00+08:00", person: "Ana Marie Santos", action: "View", studentName: "Ana Marie Santos", studentNumber: "24-1-00124", record: "Own record", details: "Viewed curriculum checklist" },
  { id: "audit-2", timestamp: "2025-08-15T10:35:00+08:00", person: "Luis Miguel Cruz", action: "Sign-in", studentName: "Luis Miguel Cruz", studentNumber: "23-1-00218", record: "Student portal", details: "Successful school email sign-in" },
  { id: "audit-3", timestamp: "2025-08-15T10:20:00+08:00", person: "Dr. Elena Reyes", action: "View", studentName: "Ana Marie Santos", studentNumber: "24-1-00124", record: "Ana Marie Santos", details: "Viewed student academic record" },
  { id: "audit-4", timestamp: "2025-08-14T15:16:00+08:00", person: "Prof. Marco Villanueva", action: "Change", studentName: "Luis Miguel Cruz", studentNumber: "23-1-00218", record: "Luis Miguel Cruz", details: "Submitted curriculum transfer request" },
  { id: "audit-5", timestamp: "2025-08-14T14:08:00+08:00", person: "Dr. Andrea Dela Cruz", action: "View", record: "BSCS · Batch 2024", details: "Viewed batch student GWA report" },
  { id: "audit-6", timestamp: "2025-08-13T11:40:00+08:00", person: "Sofia Isabel Garcia", action: "Change", studentName: "Sofia Isabel Garcia", studentNumber: "24-1-00316", record: "Own profile", details: "Updated contact information" },
  { id: "audit-7", timestamp: "2025-08-13T09:12:00+08:00", person: "Dr. Andrea Dela Cruz", action: "Change", record: "DCST · Adviser assignments", details: "Reassigned 3 students to Dr. Elena Reyes" },
]
