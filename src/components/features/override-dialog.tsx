import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/features/form-field"

/**
 * Soft-check dialog (e.g. "Prerequisite not met"). The adviser must give a reason, which is
 * written to the audit log. The gold "Continue with override" button is the only gold button
 * in the product.
 */
function OverrideDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState<string>()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return setError("A reason is required.")
    onConfirm(reason.trim())
    setReason("")
    setError(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-foreground">{description}</div>
            </DialogDescription>
          </DialogHeader>
          <FormField label="Reason for the override" htmlFor="override-reason" error={error}>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required. This is written to the audit log."
              aria-invalid={!!error}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gold text-gold-foreground hover:bg-gold/90">
              Continue with override
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { OverrideDialog }
