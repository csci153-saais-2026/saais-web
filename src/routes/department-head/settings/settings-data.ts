export type BackupScope = "department_records" | "department_academic_records"

export type BackupRecord = {
  completedAt: string
  reference: string
  location: string
  scope: BackupScope
}

export type SettingsState = {
  thresholds: { warning: number; probation: number; dismissal: number }
  senderEmail: string
  notificationTriggers: {
    adviserReassignment: boolean
    curriculumTransferDecision: boolean
    gradeEncodingClosure: boolean
  }
  latestBackup: BackupRecord | null
}

export const LAST_ENCODING_CLOSED_AT = "2025-08-07T17:00:00+08:00"

export const BACKUP_SCOPE_LABELS: Record<BackupScope, string> = {
  department_records: "All department records",
  department_academic_records: "Department academic records only",
}

/** Notification choices and richer backup metadata are proposed preview additions. */
export const DEFAULT_SETTINGS: SettingsState = {
  thresholds: { warning: 25, probation: 50, dismissal: 75 },
  senderEmail: "dcst@vsu.edu.ph",
  notificationTriggers: {
    adviserReassignment: true,
    curriculumTransferDecision: true,
    gradeEncodingClosure: false,
  },
  latestBackup: {
    completedAt: "2025-08-06T15:30:00+08:00",
    reference: "DEMO-DCST-20250806",
    location: "Institutional storage / DCST / Sample backup",
    scope: "department_records",
  },
}
