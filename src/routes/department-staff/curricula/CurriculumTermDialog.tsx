import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import { useCreateCurriculumTerm } from '@/hooks/use-curricula'
import type { CurriculumVersion } from './curricula.api'
import { curriculumTermSchema, type CurriculumTermValues } from './curriculum-term.schema'

function termError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'You do not have permission to add terms to this curriculum.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isConflict) return `The term could not be added because the position or curriculum changed. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return 'The creation result could not be confirmed. Refresh the curriculum before submitting again.'
  }
  return error instanceof Error ? error.message : 'The term could not be added.'
}

export function CurriculumTermDialog({ version, onClose, onAdded }: {
  version: CurriculumVersion
  onClose: () => void
  onAdded: (versionId: string) => void
}) {
  const creation = useCreateCurriculumTerm()
  const submitting = useRef(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CurriculumTermValues>({
    resolver: zodResolver(curriculumTermSchema), defaultValues: { year_level: 1, term_sequence: 1 },
  })
  const pending = isSubmitting || creation.isPending
  async function submit(values: CurriculumTermValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      const result = await creation.mutateAsync({ versionId: version.id, values })
      onAdded(result.versionId)
    } catch {
      // Keep the user's position and show the normalized error below.
    } finally {
      submitting.current = false
    }
  }
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Add curriculum term</DialogTitle>
        <DialogDescription>Add an empty positional term to {version.version_label}. This defines a year and term position in the curriculum, rather than calendar dates. Requirements can be added afterward.</DialogDescription>
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
        {creation.isError && <p role="alert" className="text-sm text-destructive">{termError(creation.error)}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Adding term...' : 'Add term'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
