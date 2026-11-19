import { useState, type FormEvent } from 'react'
import { FormField } from '@/components/features/form-field'
import { AlertIcon } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { reassignmentSchema } from './reassignment.schema'

type Props = {
  studentCount: number
  advisers: readonly { id: string; label: string }[]
  advisersLoading: boolean
  advisersError: boolean
  onRetry: () => void
  onClose: () => void
  onConfirm: (input: { adviserId: string; effectiveDate: string; reason: string }) => Promise<void>
}
const todayInManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

export function ReassignAdviserDialog({ studentCount, advisers, advisersLoading, advisersError, onRetry, onClose, onConfirm }: Props) {
  const [adviserId, setAdviserId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(todayInManila)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const future = effectiveDate > todayInManila()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const result = reassignmentSchema.safeParse({ adviser_id: adviserId, effective_since: effectiveDate, reason })
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Check the reassignment details.'); return }
    setError('')
    setBusy(true)
    try {
      await onConfirm({ adviserId: result.data.adviser_id, effectiveDate: result.data.effective_since, reason: result.data.reason })
      onClose()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The reassignment could not be applied.')
    } finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-170">
      <DialogHeader><DialogTitle>Reassign selected students</DialogTitle><DialogDescription className="sr-only">Choose a new adviser for the selected students.</DialogDescription></DialogHeader>
      <Alert variant="advisory"><AlertIcon /><AlertDescription>{studentCount} selected student{studentCount === 1 ? '' : 's'}</AlertDescription></Alert>
      <form onSubmit={(event) => void submit(event)} noValidate className="grid gap-4">
        <FormField label="New adviser" htmlFor="staff-reassignment-adviser"><Select value={adviserId} onValueChange={setAdviserId} disabled={busy || advisersLoading || advisersError}><SelectTrigger id="staff-reassignment-adviser" className="w-full"><SelectValue placeholder="Choose an adviser" /></SelectTrigger><SelectContent>{advisers.map((adviser) => <SelectItem key={adviser.id} value={adviser.id}>{adviser.label}</SelectItem>)}</SelectContent></Select></FormField>
        {advisersLoading && <p role="status">Loading advisers…</p>}
        {advisersError && <div role="alert">Could not load advisers. <Button type="button" variant="link" onClick={onRetry}>Try again</Button></div>}
        <FormField label="Effective since" htmlFor="staff-reassignment-date" hint={future ? 'A future date schedules the change and keeps the current adviser displayed.' : "The date cannot precede any selected student's current assignment."}><Input id="staff-reassignment-date" type="date" value={effectiveDate} disabled={busy} onChange={(event) => setEffectiveDate(event.target.value)} /></FormField>
        <FormField label="Reason for reassignment" htmlFor="staff-reassignment-reason"><Textarea id="staff-reassignment-reason" value={reason} disabled={busy} maxLength={2000} onChange={(event) => setReason(event.target.value)} placeholder="Explain the adviser change." rows={3} /></FormField>
        <p className="text-xs text-muted-foreground">The previous adviser and original assignment date remain in the student’s assignment history.</p>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || advisersLoading || advisersError}>{busy ? 'Saving…' : future ? 'Schedule reassignment' : 'Apply reassignment'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
