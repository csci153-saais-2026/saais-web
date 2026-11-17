import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import type { CurriculumVersion, Program } from './curricula.api'
import { curriculumVersionEditSchema, curriculumVersionSchema, type CurriculumVersionValues } from './curriculum-version.schema'
import { useCreateCurriculumVersion, useUpdateCurriculumVersion } from '@/hooks/use-curricula'

function versionError(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return editing ? 'You do not have permission to edit this curriculum version.' : 'You do not have permission to create a version for this program.'
    if (error.isConflict) return `The version could not be ${editing ? 'updated' : 'created'} because of a conflict. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before submitting again.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isNetworkError) return editing ? 'The update result could not be confirmed. Refresh the version list before submitting again.' : 'The creation result could not be confirmed. Refresh the version list before submitting again to avoid a duplicate.'
  }
  return error instanceof Error ? error.message : `The version could not be ${editing ? 'updated' : 'created'}.`
}

type CurriculumVersionDialogProps = {
  programs: Program[]
  onClose: () => void
} & ({ version?: undefined; onCreated: (versionId: string) => void; onUpdated?: never } |
  { version: CurriculumVersion; onUpdated: (versionId: string) => void; onCreated?: never })

export function CurriculumVersionDialog({ programs, onClose, onCreated, version, onUpdated }: CurriculumVersionDialogProps) {
  const creation = useCreateCurriculumVersion()
  const update = useUpdateCurriculumVersion()
  const editing = version !== undefined
  const mutation = editing ? update : creation
  const submitting = useRef(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CurriculumVersionValues>({
    resolver: zodResolver(editing ? curriculumVersionEditSchema : curriculumVersionSchema),
    defaultValues: version ? { program_id: version.program_id, version_label: version.version_label, effective_start: version.effective_start, effective_end: version.effective_end ?? '', total_units: version.total_units, delinquency_threshold: version.delinquency_threshold, status: version.status } : { program_id: '', version_label: '', effective_start: '', effective_end: '', total_units: 0, delinquency_threshold: 0, status: 'draft' },
  })
  const pending = isSubmitting || mutation.isPending

  async function submit(values: CurriculumVersionValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      if (version) {
        const result = await update.mutateAsync({ original: version, values })
        onUpdated(result.version.id)
      } else {
        const result = await creation.mutateAsync(values)
        onCreated(result.version.id)
      }
    } catch {
      // Preserve inputs; the normalized mutation error is shown below.
    } finally {
      submitting.current = false
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit curriculum version' : 'Create curriculum version'}</DialogTitle>
        <DialogDescription>{editing ? 'Update version details. Existing student assignments and historical records stay attached to this version; students are not migrated by this change.' : 'Create a blank version for a department program. Terms and requirements can be added afterward.'}</DialogDescription>
      </DialogHeader>
      <form noValidate onSubmit={event => { void handleSubmit(submit)(event) }} className="space-y-4" aria-busy={pending}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <FormField label="Program" htmlFor="new-version-program" error={errors.program_id?.message}>
            {editing ? <>
              <Input id="new-version-program" readOnly value={programs.find(program => program.id === version.program_id)?.code ?? 'Program unavailable'} />
              <input type="hidden" {...register('program_id')} />
            </> : <select id="new-version-program" className="min-h-11 w-full rounded-sm border border-input bg-card px-3" aria-invalid={!!errors.program_id} {...register('program_id')}>
              <option value="">Select a program</option>
              {programs.map(program => <option key={program.id} value={program.id}>{program.code} - {program.name}</option>)}
            </select>}
          </FormField>
          <FormField label="Version label" htmlFor="new-version-label" error={errors.version_label?.message}>
            <Input id="new-version-label" maxLength={editing ? 250 : 100} aria-invalid={!!errors.version_label} {...register('version_label')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Effective start" htmlFor="new-version-start" error={errors.effective_start?.message}>
              <Input id="new-version-start" type="date" aria-invalid={!!errors.effective_start} {...register('effective_start')} />
            </FormField>
            <FormField label="Effective end (optional)" htmlFor="new-version-end" error={errors.effective_end?.message}>
              <Input id="new-version-end" type="date" aria-invalid={!!errors.effective_end} {...register('effective_end')} />
            </FormField>
            <FormField label="Required units" htmlFor="new-version-units" error={errors.total_units?.message}>
              <Input id="new-version-units" type="number" min={0} step={0.25} aria-invalid={!!errors.total_units} {...register('total_units', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Delinquency threshold (failed units)" htmlFor="new-version-threshold" error={errors.delinquency_threshold?.message}>
              <Input id="new-version-threshold" type="number" min={0} step={0.25} aria-invalid={!!errors.delinquency_threshold} {...register('delinquency_threshold', { valueAsNumber: true })} />
            </FormField>
          </div>
          <FormField label="Status" htmlFor="new-version-status" error={errors.status?.message}>
            <select id="new-version-status" className="min-h-11 w-full rounded-sm border border-input bg-card px-3" aria-invalid={!!errors.status} {...register('status')}>
              <option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option><option value="teach_out">Teach out</option><option value="closed">Closed</option>
            </select>
          </FormField>
        </fieldset>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{versionError(mutation.error, editing)}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{editing ? pending ? 'Saving version...' : 'Save changes' : pending ? 'Creating version...' : 'Create version'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
