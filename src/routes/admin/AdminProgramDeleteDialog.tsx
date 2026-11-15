import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiClientError, type ApiSchema } from '@/lib/api'

type Program = ApiSchema<'Program'>

export function AdminProgramDeleteDialog({
  program,
  onOpenChange,
  onConfirm,
}: {
  program: Program
  onOpenChange: (open: boolean) => void
  onConfirm: (id: string) => Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmDelete() {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm(program.id)
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ApiClientError && requestError.isConflict
          ? 'This program cannot be deleted while curriculum versions, student assignments, or historical records still reference it.'
          : requestError instanceof Error
            ? requestError.message
            : 'The program could not be deleted.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {program.code}?</DialogTitle>
          <DialogDescription>
            This permanently removes {program.name} if no curriculum, student,
            or historical records depend on it. Related records will never be
            deleted automatically.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? 'Deleting…' : 'Delete program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
