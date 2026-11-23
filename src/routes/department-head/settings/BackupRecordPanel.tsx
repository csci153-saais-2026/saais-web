import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components/features/form-field";
import { Panel } from "@/components/features/panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BACKUP_SCOPE_LABELS,
  type BackupScope,
  type SettingsState,
} from "./settings-types";
import { useLastEncodingClosure, useRecordBackup } from "../shared/dh-queries";
import { useNotify } from "../shared/notify-context";

/** datetime-local is explicitly interpreted in Philippine time (UTC+08:00). */
function manilaInputValue(now: Date) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

function validDateTime(value: string) {
  const timestamp = Date.parse(`${value}:00+08:00`);
  return (
    Number.isFinite(timestamp) &&
    manilaInputValue(new Date(timestamp)) === value
  );
}

const backupSchema = z.object({
  completedAt: z
    .string()
    .min(1, "Enter the completion date and time.")
    .refine(validDateTime, "Enter a valid completion date and time.")
    .refine(
      (value) =>
        !validDateTime(value) || Date.parse(`${value}:00+08:00`) <= Date.now(),
      "Completion cannot be in the future.",
    ),
  reference: z.string().trim().min(1, "Enter the backup reference."),
  location: z
    .string()
    .trim()
    .min(1, "Enter the institutional storage location."),
  scope: z.enum([
    "department_records",
    "department_records_and_audit_log",
    "institution_wide",
  ]),
});

function BackupRecordDialog({
  settings,
  onClose,
}: {
  settings: SettingsState;
  onClose: () => void;
}) {
  const record = useRecordBackup();
  const notify = useNotify();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof backupSchema>>({
    resolver: zodResolver(backupSchema),
    defaultValues: {
      completedAt: manilaInputValue(new Date()),
      reference: "",
      location: "",
      scope: "department_records",
    },
  });

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Record a completed backup</DialogTitle>
        <DialogDescription>
          Record metadata for an existing backup. This does not create a backup
          or upload a file.
        </DialogDescription>
      </DialogHeader>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          const completedAt = new Date(
            `${values.completedAt}:00+08:00`,
          ).toISOString();
          if (
            settings.latestBackup &&
            Date.parse(completedAt) <
              Date.parse(settings.latestBackup.completedAt)
          ) {
            setError("completedAt", {
              message:
                "Use a completion time on or after the latest recorded backup.",
            });
            return;
          }
          try {
            await record.mutateAsync({
              completedAt,
              reference: values.reference,
              location: values.location,
              scope: values.scope as BackupScope,
            });
            notify("Completed backup record saved.");
            onClose();
          } catch (failure) {
            setError("completedAt", {
              message:
                failure instanceof Error
                  ? failure.message
                  : "The backup record could not be saved.",
            });
          }
        })}
      >
        <FormField
          label="Completion date and time (Philippine time)"
          htmlFor="backup-completed"
          error={errors.completedAt?.message}
        >
          <Input
            id="backup-completed"
            type="datetime-local"
            max={manilaInputValue(new Date())}
            aria-invalid={Boolean(errors.completedAt)}
            {...register("completedAt")}
          />
        </FormField>
        <FormField
          label="Backup reference"
          htmlFor="backup-reference"
          error={errors.reference?.message}
        >
          <Input
            id="backup-reference"
            placeholder="e.g. DCST-2026-001"
            aria-invalid={Boolean(errors.reference)}
            {...register("reference")}
          />
        </FormField>
        <FormField
          label="Storage location"
          htmlFor="backup-location"
          hint="Name the institutional folder or storage reference."
          error={errors.location?.message}
        >
          <Input
            id="backup-location"
            placeholder="Institutional storage / department folder"
            aria-invalid={Boolean(errors.location)}
            {...register("location")}
          />
        </FormField>
        <FormField label="Backup scope" htmlFor="backup-scope">
          <Controller
            name="scope"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="backup-scope"
                  className="w-full"
                  ref={field.ref}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BACKUP_SCOPE_LABELS) as BackupScope[]).map(
                    (scope) => (
                      <SelectItem key={scope} value={scope}>
                        {BACKUP_SCOPE_LABELS[scope]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={record.isPending}>
            Save backup record
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

function useBackupOverdue(backup: SettingsState["latestBackup"]) {
  const closure = useLastEncodingClosure().data;
  return (
    !backup ||
    (closure != null && Date.parse(backup.completedAt) < Date.parse(closure))
  );
}

export function BackupBanner({ settings }: { settings: SettingsState }) {
  const backup = settings.latestBackup;
  const overdue = useBackupOverdue(backup);
  return (
    <Alert variant={overdue ? "advisory" : "success"} role="status">
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5.5l3.5 2" />
      </svg>
      <AlertDescription>
        {backup ? (
          <>
            Last backup: <b>{formatDate(backup.completedAt)}</b>.{" "}
          </>
        ) : null}
        {overdue ? (
          <>
            {backup
              ? "No backup has been recorded since the latest encoding period closed. "
              : "No backup has been recorded yet. "}
            <b>Record a recent backup.</b>
          </>
        ) : (
          "This records completion information only; it does not verify backup contents."
        )}
      </AlertDescription>
    </Alert>
  );
}

export function BackupRecordPanel({ settings }: { settings: SettingsState }) {
  const [open, setOpen] = useState(false);
  const backup = settings.latestBackup;

  return (
    <Panel title="Backups">
      <p className="text-sm">
        Keep a completed, encrypted backup in institutional storage, then record
        it here.
      </p>
      {backup && (
        <dl className="mt-4 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="font-semibold text-muted-foreground">Completed</dt>
          <dd>
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: "Asia/Manila",
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(backup.completedAt))}{" "}
            PHT
          </dd>
          <dt className="font-semibold text-muted-foreground">Reference ID</dt>
          <dd className="break-all font-mono text-xs">{backup.reference}</dd>
          <dt className="font-semibold text-muted-foreground">
            Storage location
          </dt>
          <dd className="break-words">{backup.location}</dd>
          <dt className="font-semibold text-muted-foreground">Scope</dt>
          <dd>{BACKUP_SCOPE_LABELS[backup.scope]}</dd>
        </dl>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          className="mt-[18px]"
          onClick={() => setOpen(true)}
        >
          Record a backup made today
        </Button>
        {open && (
          <BackupRecordDialog
            settings={settings}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog>
    </Panel>
  );
}
