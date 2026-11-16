import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/features/form-field'
import { ApiClientError } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { useAdviserReassignment } from '@/hooks/use-adviser-assignments'

type StudentRow = ApiSchema<'StudentRosterItem'>

type AdviserOption = {
  id: string
  label: string
}

function getTodayInAsiaManila(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to reassign advisers in this department.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the adviser reassignment service. Check your connection and retry.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'The adviser reassignment could not be submitted.'
}

export function ReassignAdviserDialog({
  students,
  advisers,
  open,
  onClose,
  onSuccess,
}: {
  students: StudentRow[]
  advisers: AdviserOption[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const mutation = useAdviserReassignment()
  const [selectedAdviserId, setSelectedAdviserId] = useState('')
  const [effectiveSince, setEffectiveSince] = useState(getTodayInAsiaManila())
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const studentIds = useMemo(() => students.map((student) => student.student_id), [students])
  const selectedNames = useMemo(
    () => students.map((student) => student.full_name),
    [students],
  )

  useEffect(() => {
    if (!open) return
    if (advisers.length > 0) {
      setSelectedAdviserId((current) => current || advisers[0].id)
    } else {
      setSelectedAdviserId('')
    }
    setEffectiveSince(getTodayInAsiaManila())
    setReason('')
    setLocalError(null)
  }, [advisers, open])

  const duplicates = students.filter(
    (student) => student.adviser_id === selectedAdviserId,
  )

  async function handleSubmit() {
    if (studentIds.length === 0) {
      setLocalError('Select at least one student to reassign.')
      return
    }

    if (!selectedAdviserId) {
      setLocalError('Select an active adviser in this department.')
      return
    }

    if (!effectiveSince.trim()) {
      setLocalError('Choose the effective date for the new assignment.')
      return
    }

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setLocalError('Add a short reason for this reassignment.')
      return
    }

    if (duplicates.length === studentIds.length) {
      setLocalError('All selected students already have this adviser assigned.')
      return
    }

    setLocalError(null)

    try {
      await mutation.mutateAsync({
        student_ids: studentIds,
        adviser_id: selectedAdviserId,
        effective_since: effectiveSince,
        reason: trimmedReason,
      })
      onSuccess()
    } catch (error) {
      setLocalError(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reassign adviser</DialogTitle>
          <DialogDescription>
            This confirms a single multi-student reassignment for the selected department roster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            <p className="font-medium text-foreground">Selected students</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {selectedNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>

          <FormField label="Target adviser" htmlFor="reassign-adviser">
            <select
              id="reassign-adviser"
              value={selectedAdviserId}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => setSelectedAdviserId(event.target.value)}
              disabled={advisers.length === 0 || mutation.isPending}
            >
              <option value="">Select an adviser</option>
              {advisers.map((adviser) => (
                <option key={adviser.id} value={adviser.id}>
                  {adviser.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Effective since" htmlFor="reassign-effective-date">
              <input
                id="reassign-effective-date"
                type="date"
                value={effectiveSince}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => setEffectiveSince(event.target.value)}
                disabled={mutation.isPending}
              />
            </FormField>

            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Total selected</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{studentIds.length}</p>
            </div>
          </div>

          <FormField label="Reason" htmlFor="reassign-reason">
            <textarea
              id="reassign-reason"
              rows={4}
              value={reason}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Explain the reassignment reason for audit purposes."
              onChange={(event) => setReason(event.target.value)}
              disabled={mutation.isPending}
            />
          </FormField>

          {localError && (
            <p role="alert" className="text-sm text-destructive">
              {localError}
            </p>
          )}

          {mutation.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Saving adviser reassignment…
            </p>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={mutation.isPending || advisers.length === 0 || studentIds.length === 0}
          >
            Confirm reassignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
