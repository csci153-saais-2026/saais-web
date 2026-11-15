import type {
  ApiSchema,
  OperationQuery,
  OperationRequestBody,
} from '@/lib/api'

export const SETTINGS_QUERY_LIMIT = 1000
export const BACKUP_AGE_REVIEW_DAYS = 30

export type SystemSettings = ApiSchema<'SystemSettings'>
export type SettingsUpdateRequest =
  OperationRequestBody<'updateSystemSettings'>
export type BackupRecordRequest = OperationRequestBody<'recordCompletedBackup'>

export interface SettingsFormValues {
  readonly warning: string
  readonly probation: string
  readonly dismissal: string
  readonly senderEmail: string
}

export type SettingsFormErrors = Partial<
  Record<keyof SettingsFormValues, string>
>

export const SYSTEM_SETTINGS_QUERY: OperationQuery<'getSystemSettings'> = {
  select:
    'id,department_id,warning_pct,probation_pct,dismissal_pct,sender_email,last_backup_at,last_backup_reference,last_backup_location,last_backup_scope,updated_at',
  order: 'department_id.asc.nullsfirst,id.asc',
  limit: SETTINGS_QUERY_LIMIT,
}

export function getInstitutionSettings(
  rows: readonly SystemSettings[],
): SystemSettings | null {
  return rows.find((row) => row.department_id == null) ?? null
}

export function toSettingsFormValues(
  settings: SystemSettings,
): SettingsFormValues {
  return {
    warning: String(settings.warning_pct),
    probation: String(settings.probation_pct),
    dismissal: String(settings.dismissal_pct),
    senderEmail: settings.sender_email,
  }
}
