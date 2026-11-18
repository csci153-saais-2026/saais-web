import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import { useManageCurriculumSlot } from '@/hooks/use-curricula'
import type { CurriculumSlot, CurriculumTerm, CurriculumVersion } from './curricula.api'

function deleteError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'You do not have permission to delete this curriculum requirement.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isConflict) return `The requirement could not be deleted because its history is protected or it is still required. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return 'The deletion result could not be confirmed. Refresh the curriculum before submitting again.'
  }
  return error instanceof Error ? error.message : 'The requirement could not be deleted.'
}

export function CurriculumSlotDeleteDialog({ term, version, slot, onClose, onDeleted }: {
  term: CurriculumTerm
  version: CurriculumVersion
  slot: CurriculumSlot
  onClose: () => void
  onDeleted: (versionId: string) => void
}) {
  const mutation = useManageCurriculumSlot()
  const submitting = useRef(false)
  const pending = mutation.isPending
  const label = slot.slot_label || (slot.course_id ? `Course reference ${slot.course_id}` : `${slot.slot_type ?? 'curriculum'} requirement`)

  async function confirm() {
    if (submitting.current) return
    submitting.current = true
    try {
      const result = await mutation.mutateAsync({ action: 'delete', term, original: slot })
      onDeleted(result.versionId)
    } catch {
      // Keep the confirmation open so the user can read the server response.
    } finally {
      submitting.current = false
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}>
    <DialogContent showCloseButton={!pending} onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Delete curriculum requirement</DialogTitle>
        <DialogDescription>
          Delete “{label}” from Year {term.year_level} - Term {term.term_sequence} in {version.version_label}? It has {slot.nominal_units} nominal units. The service may reject deletion when academic history depends on it. No child records are deleted by this page.
        </DialogDescription>
      </DialogHeader>
      {mutation.isError && <p role="alert" className="text-sm text-destructive">{deleteError(mutation.error)}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={() => { void confirm() }}>{pending ? 'Deleting requirement...' : 'Confirm requirement deletion'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
