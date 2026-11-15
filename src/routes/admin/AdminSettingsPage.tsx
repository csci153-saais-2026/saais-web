import { useEffect, useState } from 'react'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, unwrapApiResult } from '@/lib/api'
import {
  BACKUP_AGE_REVIEW_DAYS,
  getInstitutionSettings,
  SYSTEM_SETTINGS_QUERY,
  toSettingsFormValues,
  type SystemSettings,
} from './admin-settings-model'

function backupAge(settings: SystemSettings): number | null {
  if (!settings.last_backup_at) return null
  const timestamp = Date.parse(settings.last_backup_at)
  if (!Number.isFinite(timestamp)) return null
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

function backupDate(value: string | null | undefined): string {
  if (!value) return 'No completed backup recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Backup date unavailable'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function backupScopeLabel(scope: SystemSettings['last_backup_scope']): string {
  switch (scope) {
    case 'institution_wide':
      return 'Institution-wide'
    case 'department_records':
      return 'Department records'
    case 'department_records_and_audit_log':
      return 'Department records and audit log'
    default:
      return 'Not specified'
  }
}

export default function AdminSettingsPage() {
  const [reloadCount, setReloadCount] = useState(0)
  const [requestState, setRequestState] = useState<{
    readonly request: number
    readonly settings: SystemSettings | null
    readonly error: string | null
  } | null>(null)

  useEffect(() => {
    let active = true
    void apiClient
      .GET('/rest/v1/system_settings', {
        params: { query: SYSTEM_SETTINGS_QUERY },
      })
      .then(unwrapApiResult)
      .then((rows) => {
        if (!active) return
        const settings = getInstitutionSettings(rows)
        setRequestState({
          request: reloadCount,
          settings,
          error: settings
            ? null
            : 'Institution-wide settings are not available. No department settings were used.',
        })
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setRequestState({
          request: reloadCount,
          settings: null,
          error:
            requestError instanceof Error
              ? requestError.message
              : 'System settings could not be loaded.',
        })
      })

    return () => {
      active = false
    }
  }, [reloadCount])

  const currentRequest =
    requestState?.request === reloadCount ? requestState : null
  const settings = currentRequest?.settings ?? null
  const error = currentRequest?.error ?? null
  const loading = currentRequest === null
  const values = settings ? toSettingsFormValues(settings) : null
  const ageDays = settings ? backupAge(settings) : null

  return (
    <div className="mx-auto grid max-w-7xl gap-2 p-4 sm:p-8">
      <PageHeading
        title="System settings"
        subtitle="Configure institution-wide academic standing thresholds, sender email, and backup metadata."
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Settings unavailable</AlertTitle>
          <AlertDescription className="mt-1">
            <p>{error}</p>
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Alert variant={ageDays === null || ageDays > BACKUP_AGE_REVIEW_DAYS ? 'advisory' : 'success'}>
        <AlertTitle>
          {ageDays === null
            ? 'No completed backup recorded'
            : ageDays > BACKUP_AGE_REVIEW_DAYS
              ? 'Review backup recency'
              : 'Recent backup recorded'}
        </AlertTitle>
        <AlertDescription className="mt-1">
          {settings
            ? ageDays === null
              ? 'A completed backup has not been recorded in system settings.'
              : `Last backup recorded ${backupDate(settings.last_backup_at)} (${ageDays} day${ageDays === 1 ? '' : 's'} ago).`
            : loading
              ? 'Loading backup status…'
              : 'Backup status is unavailable.'}{' '}
          The age indicator uses a 30-day informational threshold; follow
          institutional backup policy. Recording metadata here does not create,
          download, or run a backup.
        </AlertDescription>
      </Alert>

      <Panel
        title="Scholastic standing thresholds"
        description="Percentage of term units failed. Thresholds must rise in order."
      >
        {values ? (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Warning from (%)" htmlFor="settings-warning">
                <Input
                  id="settings-warning"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={values.warning}
                  readOnly
                />
              </FormField>
              <FormField label="Probation from (%)" htmlFor="settings-probation">
                <Input
                  id="settings-probation"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={values.probation}
                  readOnly
                />
              </FormField>
              <FormField label="Dismissal from (%)" htmlFor="settings-dismissal">
                <Input
                  id="settings-dismissal"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={values.dismissal}
                  readOnly
                />
              </FormField>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading threshold settings…' : 'Threshold settings are unavailable.'}
          </p>
        )}
      </Panel>

      <div className="grid gap-0 lg:grid-cols-2 lg:gap-4">
        <Panel
          title="Notification email"
          description="Notifications to students and advisers are sent from this address."
        >
          {values ? (
            <FormField label="Sender email" htmlFor="settings-email">
              <Input
                id="settings-email"
                type="email"
                value={values.senderEmail}
                readOnly
              />
            </FormField>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading sender email…' : 'Sender email is unavailable.'}
            </p>
          )}
        </Panel>

        <Panel
          title="Backups"
          description="Backup execution and storage are handled outside this settings screen."
        >
          {settings ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
              <dt className="font-medium text-muted-foreground">Last recorded</dt>
              <dd>{backupDate(settings.last_backup_at)}</dd>
              <dt className="font-medium text-muted-foreground">Scope</dt>
              <dd>{backupScopeLabel(settings.last_backup_scope)}</dd>
              <dt className="font-medium text-muted-foreground">Reference</dt>
              <dd className="break-all">{settings.last_backup_reference || 'Not specified'}</dd>
              <dt className="font-medium text-muted-foreground">Storage location</dt>
              <dd className="break-all">{settings.last_backup_location || 'Not specified'}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading backup metadata…' : 'Backup metadata is unavailable.'}
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}
