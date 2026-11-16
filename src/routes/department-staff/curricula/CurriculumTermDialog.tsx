import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import { useCreateCurriculumTerm, useManageCurriculumTerm } from '@/hooks/use-curricula'
import type { CurriculumTerm, CurriculumVersion } from './curricula.api'
import { curriculumTermSchema, type CurriculumTermValues } from './curriculum-term.schema'

function termError(error: unknown, editing: boolean): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return editing ? 'You do not have permission to edit this curriculum term.' : 'You do not have permission to add terms to this curriculum.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isConflict) return `The term could not be ${editing ? 'updated' : 'added'} because the position or curriculum changed or its history is protected. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return `The ${editing ? 'update' : 'creation'} result could not be confirmed. Refresh the curriculum before submitting again.`
  }
  return error instanceof Error ? error.message : `The term could not be ${editing ? 'updated' : 'added'}.`
}

type CurriculumTermDialogProps = {
  version: CurriculumVersion
  onClose: () => void
} & ({ term?: undefined; onAdded: (versionId: string) => void; onUpdated?: never } |
  { term: CurriculumTerm; onUpdated: (versionId: string) => void; onAdded?: never })

export function CurriculumTermDialog({ version, onClose, onAdded, term, onUpdated }: CurriculumTermDialogProps) {
  const creation = useCreateCurriculumTerm()
  const update = useManageCurriculumTerm()
  const editing = term !== undefined
  const mutation = editing ? update : creation
  const submitting = useRef(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CurriculumTermValues>({
    resolver: zodResolver(curriculumTermSchema), defaultValues: term ? { year_level: term.year_level, term_sequence: term.term_sequence } : { year_level: 1, term_sequence: 1 },
  })
  const pending = isSubmitting || mutation.isPending
  async function submit(values: CurriculumTermValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      if (term) {
        const result = await update.mutateAsync({ action: 'edit', original: term, values })
        onUpdated(result.versionId)
      } else {
        const result = await creation.mutateAsync({ versionId: version.id, values })
        onAdded(result.versionId)
      }
    } catch {
      // Keep the user's position and show the normalized error below.
    } finally {
      submitting.current = false
    }
  }
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit curriculum term' : 'Add curriculum term'}</DialogTitle>
        <DialogDescription>{editing ? `Update Year ${term.year_level} - Term ${term.term_sequence} in ${version.version_label}. Only the position changes; existing requirements remain attached. The server may reject changes to referenced terms.` : `Add an empty positional term to ${version.version_label}. This defines a year and term position in the curriculum, rather than calendar dates. Requirements can be added afterward.`}</DialogDescription>
      </DialogHeader>
      <form noValidate className="grid gap-4" aria-busy={pending} onSubmit={event => { void handleSubmit(submit)(event) }}>
        <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <FormField label="Year level" htmlFor="curriculum-term-year" error={errors.year_level?.message}>
            <Input id="curriculum-term-year" type="number" min={1} max={8} step={1} aria-invalid={!!errors.year_level} {...register('year_level', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Term position" htmlFor="curriculum-term-sequence" error={errors.term_sequence?.message}>
            <select id="curriculum-term-sequence" className="min-h-11 w-full rounded-sm border border-input bg-card px-3" aria-invalid={!!errors.term_sequence} {...register('term_sequence', { valueAsNumber: true })}>
              <option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option>
            </select>
          </FormField>
        </fieldset>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{termError(mutation.error, editing)}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{editing ? pending ? 'Saving term...' : 'Save term' : pending ? 'Adding term...' : 'Add term'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
