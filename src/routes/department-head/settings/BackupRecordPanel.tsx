import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField } from "@/components/features/form-field"
import { Panel } from "@/components/features/panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BACKUP_SCOPE_LABELS, LAST_ENCODING_CLOSED_AT } from "./settings-data"
import { useDepartmentHeadPreview } from "../shared/preview-state"

/** datetime-local is explicitly interpreted in Philippine time (UTC+08:00). */
function manilaInputValue(now: Date) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

function validDateTime(value: string) {
  const timestamp = Date.parse(`${value}:00+08:00`)
  return Number.isFinite(timestamp) && manilaInputValue(new Date(timestamp)) === value
}

const backupSchema = z.object({
  completedAt: z.string().min(1, "Enter the completion date and time.")
    .refine(validDateTime, "Enter a valid completion date and time.")
    .refine((value) => !validDateTime(value) || Date.parse(`${value}:00+08:00`) <= Date.now(), "Completion cannot be in the future."),
  reference: z.string().trim().min(1, "Enter the backup reference."),
  location: z.string().trim().min(1, "Enter the institutional storage location."),
  scope: z.enum(["department_records", "department_academic_records"]),
})

function BackupRecordDialog({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, notify } = useDepartmentHeadPreview()
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof backupSchema>>({
    resolver: zodResolver(backupSchema),
    defaultValues: { completedAt: manilaInputValue(new Date()), reference: "", location: "", scope: "department_records" },
  })

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Record a completed backup</DialogTitle>
        <DialogDescription>Record sample metadata for an existing backup. This does not create a backup or upload a file.</DialogDescription>
      </DialogHeader>
      <form noValidate className="space-y-4" onSubmit={handleSubmit((values) => {
        const completedAt = new Date(`${values.completedAt}:00+08:00`).toISOString()
        if (settings.latestBackup && Date.parse(completedAt) < Date.parse(settings.latestBackup.completedAt)) {
          setError("completedAt", { message: "Use a completion time on or after the latest recorded backup." })
          return
        }
        updateSettings({ ...settings, latestBackup: { completedAt, reference: values.reference, location: values.location, scope: values.scope } })
        notify("Completed backup record saved in this preview. No backup was created.")
        onClose()
      })}>
        <FormField label="Completion date and time (Philippine time)" htmlFor="backup-completed" error={errors.completedAt?.message}>
          <Input id="backup-completed" type="datetime-local" max={manilaInputValue(new Date())} aria-invalid={Boolean(errors.completedAt)} {...register("completedAt")} />
        </FormField>
        <FormField label="Backup reference" htmlFor="backup-reference" error={errors.reference?.message}>
          <Input id="backup-reference" placeholder="e.g. DCST-2026-001" aria-invalid={Boolean(errors.reference)} {...register("reference")} />
        </FormField>
        <FormField label="Storage location" htmlFor="backup-location" hint="Name the institutional folder or storage reference." error={errors.location?.message}>
          <Input id="backup-location" placeholder="Institutional storage / department folder" aria-invalid={Boolean(errors.location)} {...register("location")} />
        </FormField>
        <FormField label="Backup scope" htmlFor="backup-scope">
          <Controller name="scope" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="backup-scope" className="w-full" ref={field.ref} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="department_records">{BACKUP_SCOPE_LABELS.department_records}</SelectItem>
                <SelectItem value="department_academic_records">{BACKUP_SCOPE_LABELS.department_academic_records}</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save backup record</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function BackupRecordPanel() {
  const { settings } = useDepartmentHeadPreview()
  const [open, setOpen] = useState(false)
  const backup = settings.latestBackup
  const overdue = !backup || Date.parse(backup.completedAt) < Date.parse(LAST_ENCODING_CLOSED_AT)

  return (
    <Panel title="Backup records" description="Sample metadata only. Keep actual backups in institutional storage.">
      <Alert variant={overdue ? "advisory" : "success"} role="status" className="mb-5">
        <AlertTitle>{overdue ? "A newer backup record is needed." : "Backup record is after the sample encoding closure."}</AlertTitle>
        <AlertDescription>{overdue ? "No backup is recorded after the sample encoding period closed on 7 August 2025." : "This records completion information only; it does not verify backup contents."}</AlertDescription>
      </Alert>
      {backup ? (
        <dl className="mb-5 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="font-semibold text-muted-foreground">Completed</dt><dd>{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(backup.completedAt))} PHT</dd>
          <dt className="font-semibold text-muted-foreground">Reference ID</dt><dd className="break-all font-mono text-xs">{backup.reference}</dd>
          <dt className="font-semibold text-muted-foreground">Storage location</dt><dd className="break-words">{backup.location}</dd>
          <dt className="font-semibold text-muted-foreground">Scope</dt><dd>{BACKUP_SCOPE_LABELS[backup.scope]}</dd>
        </dl>
      ) : <p className="mb-5 text-sm text-muted-foreground">No completed backup record yet.</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>Record a completed backup</Button>
        {open && <BackupRecordDialog onClose={() => setOpen(false)} />}
      </Dialog>
    </Panel>
  )
}
