import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/features/form-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateSchoolTerm } from '@/hooks/use-academic-terms'
import { staffQueryKeys } from '../shared/staff-query-keys'
import { useStaffScope } from '../shared/use-staff-scope'
import { closeSchoolTermEncoding } from './academic-terms.api'
import { schoolTermFormSchema, type SchoolTermFormValues } from './school-term.schema'

export function AddAcademicTermDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const scope = useStaffScope()
  const create = useCreateSchoolTerm()
  const queryClient = useQueryClient()
  const year = new Date().getFullYear()
  const [academicYear, setAcademicYear] = useState(`${year}–${year + 1}`)
  const [semester, setSemester] = useState<SchoolTermFormValues['term_type']>('1st Semester')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState<'Open' | 'Closed'>('Open')
  const [createdTermId, setCreatedTermId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  async function submit() {
    if (inFlight.current) return
    if (scope.status !== 'ready') { setError('An authorized department is required.'); return }
    let values: SchoolTermFormValues | undefined
    if (!createdTermId) {
      const years = /^\s*(\d{4})\s*[-–]\s*(\d{4})\s*$/.exec(academicYear)
      if (!years) { setError('Enter the academic year as 2026–2027.'); return }
      const parsed = schoolTermFormSchema.safeParse({ start_year: Number(years[1]), end_year: Number(years[2]), term_type: semester, starts_on: startDate, ends_on: endDate, encoding_deadline: deadline })
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the term details.'); return }
      values = parsed.data
    }
    setError('')
    inFlight.current = true
    setBusy(true)
    try {
      let termId = createdTermId
      if (!termId && values) {
        const result = await create.mutateAsync(values)
        termId = result.term.id
        setCreatedTermId(termId)
      }
      if (!termId) throw new Error('The created term could not be confirmed.')
      if (status === 'Closed') {
        await closeSchoolTermEncoding(termId, { scope: 'department', department_id: scope.departmentId })
        await queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(scope.profileId, scope.departmentId, 'academic-terms') })
      }
      onSaved()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The term could not be added.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
    <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-170" showCloseButton={!busy}
      onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }} onInteractOutside={(event) => { if (busy) event.preventDefault() }}>
      <DialogHeader className="border-b border-line-soft px-5 py-4 pr-14 sm:px-6 sm:py-5"><DialogTitle className="text-[22px] leading-[1.08] tracking-[-0.01em] sm:text-2xl">Add academic term</DialogTitle><DialogDescription className="sr-only">Add an academic term for your department.</DialogDescription></DialogHeader>
      <div className="p-5 text-sm sm:p-6">
        <fieldset disabled={busy || !!createdTermId} className="grid min-w-0 grid-cols-1 gap-4.5 sm:grid-cols-2">
          <FormField label="Academic year" htmlFor="staff-add-ay"><Input id="staff-add-ay" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} /></FormField>
          <FormField label="Semester" htmlFor="staff-add-semester"><Select value={semester} onValueChange={(value) => setSemester(value as SchoolTermFormValues['term_type'])} disabled={busy || !!createdTermId}><SelectTrigger id="staff-add-semester" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1st Semester">1st semester</SelectItem><SelectItem value="2nd Semester">2nd semester</SelectItem><SelectItem value="Summer">Midyear</SelectItem></SelectContent></Select></FormField>
          <FormField label="Start date" htmlFor="staff-add-start"><Input id="staff-add-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></FormField>
          <FormField label="Actual end date" htmlFor="staff-add-end"><Input id="staff-add-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></FormField>
          <FormField label="Encoding deadline" htmlFor="staff-add-deadline"><Input id="staff-add-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></FormField>
          <FormField label="Encoding status" htmlFor="staff-add-status"><Select value={status} onValueChange={(value) => setStatus(value as 'Open' | 'Closed')} disabled={busy || !!createdTermId}><SelectTrigger id="staff-add-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select></FormField>
        </fieldset>
        {createdTermId && error && <p className="mt-4 text-sm text-muted-foreground">The term was created, but closing encoding could not be confirmed. Retry closing encoding or cancel and review the term.</p>}
        {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
      </div>
      <DialogFooter className="border-t border-line-soft px-5 py-4 sm:px-6"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => void submit()}>{busy ? 'Saving…' : createdTermId ? 'Retry closing encoding' : 'Add term'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
