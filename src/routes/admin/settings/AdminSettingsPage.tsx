import { notify } from "@/lib/notify";
import { useEffect, useState, type FormEvent } from "react";
import { FormField } from "@/components/features/form-field";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, unwrapApiResult } from "@/lib/api";
import {
  BACKUP_AGE_REVIEW_DAYS,
  buildSenderEmailUpdate,
  buildThresholdUpdate,
  getInstitutionSettings,
  SYSTEM_SETTINGS_QUERY,
  toSettingsFormValues,
  validateSenderEmail,
  validateThresholds,
  type SettingsFormErrors,
  type SettingsFormValues,
  type BackupRecordRequest,
  type SystemSettings,
  type SettingsUpdateRequest,
} from "./admin-settings-model";

function backupAge(settings: SystemSettings): number | null {
  if (!settings.last_backup_at) return null;
  const timestamp = Date.parse(settings.last_backup_at);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function backupDate(value: string | null | undefined): string {
  if (!value) return "No completed backup recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Backup date unavailable"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function backupScopeLabel(scope: SystemSettings["last_backup_scope"]): string {
  switch (scope) {
    case "institution_wide":
      return "Institution-wide";
    case "department_records":
      return "Department records";
    case "department_records_and_audit_log":
      return "Department records and audit log";
    default:
      return "Not specified";
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function SettingsEditor({
  settings,
  onSave,
  onRecord,
}: {
  settings: SystemSettings;
  onSave: (request: SettingsUpdateRequest) => Promise<void>;
  onRecord: (request: BackupRecordRequest) => Promise<void>;
}) {
  const [values, setValues] = useState<SettingsFormValues>(() =>
    toSettingsFormValues(settings),
  );
  const [thresholdErrors, setThresholdErrors] = useState<SettingsFormErrors>(
    {},
  );
  const [emailErrors, setEmailErrors] = useState<SettingsFormErrors>({});
  const [thresholdFeedback, setThresholdFeedback] = useState<string | null>(
    null,
  );
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  function update<K extends keyof SettingsFormValues>(
    key: K,
    value: SettingsFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setThresholdErrors((current) => ({ ...current, [key]: undefined }));
    setEmailErrors((current) => ({ ...current, [key]: undefined }));
    setThresholdFeedback(null);
    setEmailFeedback(null);
  }

  async function saveThresholds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateThresholds(values);
    setThresholdErrors(errors);
    setThresholdFeedback(null);
    if (Object.keys(errors).length > 0) return;

    setSavingThresholds(true);
    try {
      await onSave(buildThresholdUpdate(values));
      notify.success("Academic-standing thresholds saved.");
    } catch (error: unknown) {
      setThresholdFeedback(
        getErrorMessage(error, "Thresholds could not be saved."),
      );
    } finally {
      setSavingThresholds(false);
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateSenderEmail(values.senderEmail);
    setEmailErrors(errors);
    setEmailFeedback(null);
    if (Object.keys(errors).length > 0) return;

    setSavingEmail(true);
    try {
      await onSave(buildSenderEmailUpdate(values.senderEmail));
      notify.success("Notification sender email saved.");
    } catch (error: unknown) {
      setEmailFeedback(
        getErrorMessage(error, "Sender email could not be saved."),
      );
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <>
      <Panel
        title="Scholastic standing thresholds"
        description="Percentage of the term's units failed. Thresholds must satisfy 0 < warning < probation < dismissal ≤ 100."
      >
        <form className="grid gap-5" onSubmit={saveThresholds} noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Warning from (%)"
              htmlFor="settings-warning"
              error={thresholdErrors.warning}
            >
              <Input
                id="settings-warning"
                type="number"
                min={0}
                max={100}
                step="any"
                value={values.warning}
                aria-invalid={Boolean(thresholdErrors.warning)}
                disabled={savingThresholds}
                onChange={(event) =>
                  update("warning", event.currentTarget.value)
                }
              />
            </FormField>
            <FormField
              label="Probation from (%)"
              htmlFor="settings-probation"
              error={thresholdErrors.probation}
            >
              <Input
                id="settings-probation"
                type="number"
                min={0}
                max={100}
                step="any"
                value={values.probation}
                aria-invalid={Boolean(thresholdErrors.probation)}
                disabled={savingThresholds}
                onChange={(event) =>
                  update("probation", event.currentTarget.value)
                }
              />
            </FormField>
            <FormField
              label="Dismissal from (%)"
              htmlFor="settings-dismissal"
              error={thresholdErrors.dismissal}
            >
              <Input
                id="settings-dismissal"
                type="number"
                min={0}
                max={100}
                step="any"
                value={values.dismissal}
                aria-invalid={Boolean(thresholdErrors.dismissal)}
                disabled={savingThresholds}
                onChange={(event) =>
                  update("dismissal", event.currentTarget.value)
                }
              />
            </FormField>
          </div>
          {thresholdFeedback && (
            <p role="alert" className="text-sm text-destructive">
              {thresholdFeedback}
            </p>
          )}
          <div>
            <Button
              type="submit"
              aria-label="Save thresholds"
              disabled={savingThresholds}
            >
              {savingThresholds ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Panel>

      <div className="grid gap-0 lg:grid-cols-2 lg:gap-4">
        <Panel
          title="Email"
          description="Notifications to students and advisers are sent from this address."
        >
          <form className="grid gap-5" onSubmit={saveEmail} noValidate>
            <FormField
              label="Sender address"
              htmlFor="settings-email"
              error={emailErrors.senderEmail}
            >
              <Input
                id="settings-email"
                type="email"
                maxLength={254}
                value={values.senderEmail}
                aria-invalid={Boolean(emailErrors.senderEmail)}
                disabled={savingEmail}
                onChange={(event) =>
                  update("senderEmail", event.currentTarget.value)
                }
              />
            </FormField>
            {emailFeedback && (
              <p role="alert" className="text-sm text-destructive">
                {emailFeedback}
              </p>
            )}
            <div>
              <Button
                type="submit"
                aria-label="Save sender email"
                disabled={savingEmail}
              >
                {savingEmail ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Panel>

        <BackupMetadataPanel settings={settings} onRecord={onRecord} />
      </div>
    </>
  );
}

function BackupMetadataPanel({
  settings,
  onRecord,
}: {
  settings: SystemSettings;
  onRecord: (request: BackupRecordRequest) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function recordBackup() {
    setRecording(true);
    setFeedback(null);
    try {
      await onRecord({ scope: "institution_wide" });
      notify.success(
        "Completed backup metadata recorded. This action did not create or run a backup.",
      );
    } catch (error: unknown) {
      setFeedback(
        getErrorMessage(error, "Backup metadata could not be recorded."),
      );
    } finally {
      setRecording(false);
    }
  }

  return (
    <Panel title="Backups">
      <dl className="grid gap-3 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
        <dt className="font-medium text-muted-foreground">Last recorded</dt>
        <dd>{backupDate(settings.last_backup_at)}</dd>
        <dt className="font-medium text-muted-foreground">Scope</dt>
        <dd>{backupScopeLabel(settings.last_backup_scope)}</dd>
        <dt className="font-medium text-muted-foreground">Reference</dt>
        <dd className="break-all">
          {settings.last_backup_reference || "Not specified"}
        </dd>
        <dt className="font-medium text-muted-foreground">Storage location</dt>
        <dd className="break-all">
          {settings.last_backup_location || "Not specified"}
        </dd>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Keep a completed, encrypted backup in institutional storage, then record
        it here. Recording does not create or run a backup.
      </p>
      {feedback && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {feedback}
        </p>
      )}
      <Button
        className="mt-4"
        disabled={recording}
        onClick={() => void recordBackup()}
      >
        {recording ? "Recording…" : "Record a backup made today"}
      </Button>
    </Panel>
  );
}

export default function AdminSettingsPage() {
  const [reloadCount, setReloadCount] = useState(0);
  const [requestState, setRequestState] = useState<{
    readonly request: number;
    readonly settings: SystemSettings | null;
    readonly error: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient
      .GET("/rest/v1/system_settings", {
        params: { query: SYSTEM_SETTINGS_QUERY },
      })
      .then(unwrapApiResult)
      .then((rows) => {
        if (!active) return;
        const settings = getInstitutionSettings(rows);
        setRequestState({
          request: reloadCount,
          settings,
          error: settings
            ? null
            : "Institution-wide settings are not available. No department settings were used.",
        });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setRequestState({
          request: reloadCount,
          settings: null,
          error:
            requestError instanceof Error
              ? requestError.message
              : "System settings could not be loaded.",
        });
      });

    return () => {
      active = false;
    };
  }, [reloadCount]);

  const currentRequest =
    requestState?.request === reloadCount ? requestState : null;
  const settings = currentRequest?.settings ?? null;
  const error = currentRequest?.error ?? null;
  const loading = currentRequest === null;
  const ageDays = settings ? backupAge(settings) : null;

  async function saveSettings(request: SettingsUpdateRequest) {
    const updated = unwrapApiResult(
      await apiClient.PUT("/functions/v1/settings", { body: request }),
    );
    setRequestState((current) =>
      current?.request === reloadCount
        ? {
            ...current,
            settings: current.settings
              ? {
                  ...current.settings,
                  ...(request.warning_pct !== undefined
                    ? { warning_pct: updated.warning_pct }
                    : {}),
                  ...(request.probation_pct !== undefined
                    ? { probation_pct: updated.probation_pct }
                    : {}),
                  ...(request.dismissal_pct !== undefined
                    ? { dismissal_pct: updated.dismissal_pct }
                    : {}),
                  ...(request.sender_email !== undefined
                    ? { sender_email: updated.sender_email }
                    : {}),
                }
              : updated,
          }
        : current,
    );
  }

  async function recordCompletedBackup(request: BackupRecordRequest) {
    const updated = unwrapApiResult(
      await apiClient.POST("/functions/v1/settings/record-backup", {
        body: request,
      }),
    );
    setRequestState((current) =>
      current?.request === reloadCount
        ? {
            ...current,
            settings: current.settings
              ? {
                  ...current.settings,
                  last_backup_at: updated.last_backup_at,
                  last_backup_by: updated.last_backup_by,
                  last_backup_reference: updated.last_backup_reference,
                  last_backup_location: updated.last_backup_location,
                  last_backup_scope: updated.last_backup_scope,
                }
              : updated,
          }
        : current,
    );
  }

  return (
    <div className="grid gap-2">
      <PageHeading
        title="Settings"
        subtitle="System-wide values used by every portal."
        className="mb-6"
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

      <Alert
        variant={
          ageDays === null || ageDays > BACKUP_AGE_REVIEW_DAYS
            ? "advisory"
            : "success"
        }
      >
        <AlertTitle>
          {ageDays === null
            ? "No completed backup recorded"
            : ageDays > BACKUP_AGE_REVIEW_DAYS
              ? "Review backup recency"
              : "Recent backup recorded"}
        </AlertTitle>
        <AlertDescription className="mt-1">
          {settings
            ? ageDays === null
              ? "A completed backup has not been recorded in system settings."
              : `Last backup: ${backupDate(settings.last_backup_at)} (${ageDays} day${ageDays === 1 ? "" : "s"} ago).`
            : loading
              ? "Loading backup status…"
              : "Backup status is unavailable."}{" "}
          Backups are made in institutional storage; follow institutional backup
          policy.
        </AlertDescription>
      </Alert>

      {settings ? (
        <>
          <SettingsEditor
            key={settings.id}
            settings={settings}
            onSave={saveSettings}
            onRecord={recordCompletedBackup}
          />
        </>
      ) : (
        <>
          <Panel
            title="Scholastic standing thresholds"
            description="Percentage of term units failed."
          >
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading threshold settings…"
                : "Threshold settings are unavailable."}
            </p>
          </Panel>
          <div className="grid gap-0 lg:grid-cols-2 lg:gap-4">
            <Panel
              title="Email"
              description="Notifications to students and advisers are sent from this address."
            >
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading sender email…"
                  : "Sender email is unavailable."}
              </p>
            </Panel>
            <Panel title="Backups">
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading backup metadata…"
                  : "Backup metadata is unavailable."}
              </p>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
