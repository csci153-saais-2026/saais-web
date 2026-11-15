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

export function validateThresholds(
  values: Pick<SettingsFormValues, 'warning' | 'probation' | 'dismissal'>,
): SettingsFormErrors {
  const errors: SettingsFormErrors = {}
  const warning = Number(values.warning)
  const probation = Number(values.probation)
  const dismissal = Number(values.dismissal)

  if (
    !values.warning.trim() ||
    !Number.isFinite(warning) ||
    warning <= 0 ||
    warning > 100
  ) {
    errors.warning = 'Warning must be greater than 0% and no more than 100%.'
  }
  if (
    !values.probation.trim() ||
    !Number.isFinite(probation) ||
    probation <= 0 ||
    probation > 100
  ) {
    errors.probation = 'Probation must be greater than 0% and no more than 100%.'
  }
  if (
    !values.dismissal.trim() ||
    !Number.isFinite(dismissal) ||
    dismissal <= 0 ||
    dismissal > 100
  ) {
    errors.dismissal = 'Dismissal must be greater than 0% and no more than 100%.'
  }
  if (Object.keys(errors).length === 0) {
    if (warning >= probation) {
      errors.warning = 'Warning must be less than probation.'
    }
    if (probation >= dismissal) {
      errors.probation = 'Probation must be less than dismissal.'
    }
  }
  return errors
}

export function validateSenderEmail(
  senderEmail: string,
): Pick<SettingsFormErrors, 'senderEmail'> {
  const email = senderEmail.trim()
  return email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? {}
    : { senderEmail: 'Enter a valid email address (254 characters maximum).' }
}

export function buildThresholdUpdate(
  values: Pick<SettingsFormValues, 'warning' | 'probation' | 'dismissal'>,
): Pick<SettingsUpdateRequest, 'warning_pct' | 'probation_pct' | 'dismissal_pct'> {
  return {
    warning_pct: Number(values.warning),
    probation_pct: Number(values.probation),
    dismissal_pct: Number(values.dismissal),
  }
}

export function buildSenderEmailUpdate(
  senderEmail: string,
): Pick<SettingsUpdateRequest, 'sender_email'> {
  return { sender_email: senderEmail.trim() }
}
