import { useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FormField } from '@/components/features/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError } from '@/lib/api'
import { useCloseAcademicTermEncoding } from '@/hooks/use-academic-terms'
import type { SchoolTerm } from './academic-terms.api'
import {
  encodingClosureFormSchema,
  encodingClosureNote,
  type EncodingClosureFormValues,
} from './encoding-closure.schema'

function termTypeLabel(termType: SchoolTerm['term_type']): string {
  return termType === 'Summer' ? 'Summer/Midyear' : termType
}

function writeErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to close encoding for this department.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isConflict) {
      return `Department encoding could not be closed because its state changed. Refresh the academic terms and review the current status. ${error.message}`
    }
    if (error.isNetworkError) {
      return 'The close result could not be confirmed. Refresh the academic terms before retrying.'
    }
    if (error.isRateLimited) {
      return 'Too many requests. Wait before submitting again.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'Department grade encoding could not be closed.'
}

export function EncodingClosureDialog({
  term,
  onClose,
  onComplete,
}: {
  term: SchoolTerm
  onClose: () => void
  onComplete: () => void
}) {
  const closeEncoding = useCloseAcademicTermEncoding()
  const submitting = useRef(false)
  const form = useForm<EncodingClosureFormValues>({
    resolver: zodResolver(encodingClosureFormSchema),
    defaultValues: { closure_note: '' },
  })
  const pending = form.formState.isSubmitting || closeEncoding.isPending

  async function submit(values: EncodingClosureFormValues) {
    if (submitting.current) return
    submitting.current = true
    try {
      await closeEncoding.mutateAsync({
        term,
        closureNote: encodingClosureNote(values),
      })
      onComplete()
    } catch {
      // Mutation errors remain visible below and preserve the entered note.
    } finally {
      submitting.current = false
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Close department grade encoding</DialogTitle>
          <DialogDescription>
            Close encoding for {term.school_year}, {termTypeLabel(term.term_type)}.
            This blocks initial grade entry and grade or status corrections for
            students in your department, including courses offered by another
            department. The first completion of an unresolved INC remains
            allowed on or before its deadline; later corrections remain subject
            to this closure. This does not change the institution-wide term lock.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event)
          }}
          className="space-y-4"
          aria-busy={pending}
        >
          <fieldset disabled={pending} className="grid min-w-0 gap-4">
            <FormField
              label="Closure note (optional)"
              htmlFor="encoding-closure-note"
              error={form.formState.errors.closure_note?.message}
            >
              <Textarea
                id="encoding-closure-note"
                maxLength={2000}
                aria-invalid={!!form.formState.errors.closure_note}
                {...form.register('closure_note')}
              />
            </FormField>
          </fieldset>

          {closeEncoding.isError && (
            <p role="alert" className="text-sm text-destructive">
              {writeErrorMessage(closeEncoding.error)}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Closing encoding…' : 'Close grade encoding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
