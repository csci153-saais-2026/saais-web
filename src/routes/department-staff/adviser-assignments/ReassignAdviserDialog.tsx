import { useMemo, useState } from 'react'
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
import type { StudentFilterOption } from '@/routes/department-staff/students/students.api'
import type { AdviserAssignmentRosterItem } from '@/hooks/use-adviser-assignments'
import { reassignmentSchema } from './reassignment.schema'

function getTodayInAsiaManila(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatCalendarDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return `Invalid date (${value})`

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

type FieldErrors = {
  adviser_id?: string
  effective_since?: string
  reason?: string
}

export function ReassignAdviserDialog({
  students,
  advisers,
  onClose,
}: {
  students: readonly AdviserAssignmentRosterItem[]
  advisers: readonly StudentFilterOption[]
  onClose: () => void
}) {
  const [selectedAdviserId, setSelectedAdviserId] = useState(
    () => advisers[0]?.id ?? '',
  )
  const [effectiveSince, setEffectiveSince] = useState(getTodayInAsiaManila)
  const [reason, setReason] = useState('')
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<keyof FieldErrors, boolean>>
  >({})

  const earliestAllowedDate = useMemo(
    () =>
      students.reduce((latest, item) => {
        const startDate = item.currentAssignment?.start_date
        return startDate && startDate > latest ? startDate : latest
      }, ''),
    [students],
  )
  const selectedAdviser = advisers.find(
    (adviser) => adviser.id === selectedAdviserId,
  )
  const parsed = reassignmentSchema.safeParse({
    adviser_id: selectedAdviserId,
    effective_since: effectiveSince,
    reason,
  })
  const parsedEffectiveDate =
    reassignmentSchema.shape.effective_since.safeParse(effectiveSince)
  const fieldErrors: FieldErrors = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (
        (field === 'adviser_id' ||
          field === 'effective_since' ||
          field === 'reason') &&
        !fieldErrors[field]
      ) {
        fieldErrors[field] = issue.message
      }
    }
  }
  if (!fieldErrors.adviser_id && !selectedAdviser) {
    fieldErrors.adviser_id = 'Select an eligible active adviser in this department.'
  }
  if (
    !fieldErrors.effective_since &&
    parsedEffectiveDate.success &&
    earliestAllowedDate &&
    parsedEffectiveDate.data < earliestAllowedDate
  ) {
    fieldErrors.effective_since =
      `The effective date cannot be before ${formatCalendarDate(earliestAllowedDate)}.`
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prepare adviser reassignment</DialogTitle>
          <DialogDescription>
            Review the selected students and proposed assignment. This step only prepares a preview;
            it does not save changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <FormField
            label="Target adviser"
            htmlFor="reassign-adviser"
            error={touchedFields.adviser_id ? fieldErrors.adviser_id : undefined}
          >
            <select
              id="reassign-adviser"
              value={selectedAdviserId}
              aria-invalid={Boolean(touchedFields.adviser_id && fieldErrors.adviser_id)}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => {
                setSelectedAdviserId(event.target.value)
                setTouchedFields((current) => ({ ...current, adviser_id: true }))
              }}
            >
              <option value="">Select an eligible adviser</option>
              {advisers.map((adviser) => (
                <option key={adviser.id} value={adviser.id}>
                  {adviser.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Effective since"
              htmlFor="reassign-effective-date"
              hint={
                earliestAllowedDate
                  ? `Must be on or after ${formatCalendarDate(earliestAllowedDate)} (Asia/Manila date).`
                  : 'Use the calendar date in Asia/Manila.'
              }
              error={
                touchedFields.effective_since
                  ? fieldErrors.effective_since
                  : undefined
              }
            >
              <input
                id="reassign-effective-date"
                type="date"
                value={effectiveSince}
                min={earliestAllowedDate || undefined}
                aria-invalid={Boolean(
                  touchedFields.effective_since && fieldErrors.effective_since,
                )}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                onChange={(event) => {
                  setEffectiveSince(event.target.value)
                  setTouchedFields((current) => ({
                    ...current,
                    effective_since: true,
                  }))
                }}
              />
            </FormField>

            <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Selected students</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {students.length}
              </p>
            </div>
          </div>

          <FormField
            label="Reason"
            htmlFor="reassign-reason"
            hint="Required; use at most 2,000 characters."
            error={touchedFields.reason ? fieldErrors.reason : undefined}
          >
            <textarea
              id="reassign-reason"
              rows={4}
              maxLength={2000}
              value={reason}
              aria-invalid={Boolean(touchedFields.reason && fieldErrors.reason)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Explain the proposed reassignment."
              onChange={(event) => {
                setReason(event.target.value)
                setTouchedFields((current) => ({ ...current, reason: true }))
              }}
            />
          </FormField>

          <section
            aria-labelledby="reassignment-preview-heading"
            className="space-y-3 rounded-md border bg-muted/20 p-4"
          >
            <div>
              <h3
                id="reassignment-preview-heading"
                className="font-semibold text-foreground"
              >
                Reassignment preview
              </h3>
              <p role="status" className="text-sm text-muted-foreground">
                Preview only — nothing will be saved in this step.
              </p>
            </div>
            <ul className="divide-y">
              {students.map((item) => {
                const currentAssignment = item.currentAssignment
                const currentAdviser =
                  currentAssignment?.adviser_name ?? 'Adviser name unavailable'
                return (
                  <li
                    key={item.student.student_id}
                    className="grid gap-1 py-3 text-sm sm:grid-cols-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {item.student.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.student.student_number}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <dt className="text-muted-foreground">Current adviser</dt>
                      <dd>{currentAdviser}</dd>
                      <dt className="text-muted-foreground">New adviser</dt>
                      <dd>{selectedAdviser?.label ?? 'Select a target adviser'}</dd>
                      <dt className="text-muted-foreground">Current since</dt>
                      <dd>
                        {currentAssignment
                          ? formatCalendarDate(currentAssignment.start_date)
                          : 'No current assignment'}
                      </dd>
                      <dt className="text-muted-foreground">Effective since</dt>
                      <dd>
                        {effectiveSince
                          ? formatCalendarDate(effectiveSince)
                          : 'Choose a date'}
                      </dd>
                    </dl>
                  </li>
                )
              })}
            </ul>
            <div className="border-t pt-3 text-sm">
              <p className="font-medium text-foreground">Reason</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {reason.trim() || 'Enter a reason to complete the preview.'}
              </p>
            </div>
          </section>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Close preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
