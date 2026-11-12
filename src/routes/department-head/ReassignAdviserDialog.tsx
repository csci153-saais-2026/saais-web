import { useState } from "react"
import { FormField } from "@/components/features/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { todayInManila } from "./preview-state"
import type { ReassignmentInput } from "./assignment-model"

type Props = {
  studentIds: string[]
  advisers: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: ReassignmentInput) => void
}

/** Mount a fresh dialog for each selection so cancelled form values cannot leak to another group. */
export function ReassignAdviserDialog({ studentIds, advisers, open, onOpenChange, onConfirm }: Props) {
  const [adviser, setAdviser] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(todayInManila)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const future = effectiveDate > todayInManila()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onConfirm({ studentIds, adviser, effectiveDate, reason })
      onOpenChange(false)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The sample reassignment could not be applied.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reassign selected students</DialogTitle>
          <DialogDescription>
            {studentIds.length} selected student{studentIds.length === 1 ? "" : "s"}. The current and previous adviser remain visible in this preview.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <FormField label="New adviser" htmlFor="reassignment-adviser">
            <Select value={adviser} onValueChange={setAdviser}>
              <SelectTrigger id="reassignment-adviser" className="w-full"><SelectValue placeholder="Choose an adviser" /></SelectTrigger>
              <SelectContent>
                {advisers.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Effective date" htmlFor="reassignment-date"
            hint={future ? "A future date schedules the change and keeps the current adviser displayed." : "The date cannot precede any selected student's current assignment."}>
            <Input id="reassignment-date" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
          </FormField>
          <FormField label="Reason for reassignment" htmlFor="reassignment-reason">
            <Textarea id="reassignment-reason" value={reason} onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the adviser change." rows={3} />
          </FormField>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit">{future ? "Schedule reassignment" : "Apply reassignment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
