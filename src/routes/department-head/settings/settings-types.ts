export type BackupScope = "department_records" | "department_records_and_audit_log" | "institution_wide"

export type BackupRecord = {
  completedAt: string
  reference: string
  location: string
  scope: BackupScope
}

export type SettingsState = {
  thresholds: { warning: number; probation: number; dismissal: number }
  senderEmail: string
  latestBackup: BackupRecord | null
}

export const BACKUP_SCOPE_LABELS: Record<BackupScope, string> = {
  department_records: "All department records",
  department_records_and_audit_log: "Department records and audit log",
  institution_wide: "Institution-wide",
}
