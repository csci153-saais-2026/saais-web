import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiClientError } from '@/lib/api'
import { useManageCurriculumTerm } from '@/hooks/use-curricula'
import type { CurriculumTerm, CurriculumVersion } from './curricula.api'

function deletionError(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.isConflict) return `The server rejected deletion to protect referenced history or a required remaining term. ${error.message}`
    if (error.isForbidden) return 'You do not have permission to delete this curriculum term.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return 'The deletion result could not be confirmed. Refresh the curriculum before trying again.'
  }
  return error instanceof Error ? error.message : 'The term could not be deleted.'
}

export function CurriculumTermDeleteDialog({ term, version, requirementCount, onClose, onDeleted }: {
  term: CurriculumTerm
  version: CurriculumVersion
  requirementCount: number
  onClose: () => void
  onDeleted: (versionId: string) => void
}) {
  const deletion = useManageCurriculumTerm()
  const submitting = useRef(false)
  async function confirm() {
    if (submitting.current) return
    submitting.current = true
    try {
      const result = await deletion.mutateAsync({ action: 'delete', original: term })
      onDeleted(result.versionId)
    } catch {
      // Preserve the target and the server's dependency error.
    } finally {
      submitting.current = false
    }
  }
  return <Dialog open onOpenChange={open => { if (!open && !deletion.isPending) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!deletion.isPending} onEscapeKeyDown={event => { if (deletion.isPending) event.preventDefault() }} onInteractOutside={event => { if (deletion.isPending) event.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Delete curriculum term</DialogTitle>
        <DialogDescription>Delete Year {term.year_level} - Term {term.term_sequence} from {version.version_label}? This term contains {requirementCount} requirement(s). Those requirements will no longer be shown under this term if deletion succeeds.</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">The server must allow this deletion. Referenced history and required remaining terms are protected. The page will not delete child requirements separately or bypass a rejection.</p>
      {deletion.isError && <p role="alert" className="text-sm text-destructive">{deletionError(deletion.error)}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={deletion.isPending} onClick={onClose}>Cancel</Button>
        <Button type="button" variant="destructive" disabled={deletion.isPending} onClick={() => void confirm()}>{deletion.isPending ? 'Deleting term...' : 'Confirm term deletion'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
