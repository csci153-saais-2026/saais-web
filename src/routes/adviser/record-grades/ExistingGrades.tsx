import { useState } from 'react'
import type { ApiSchema } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/features/panel'
import { completeInc } from '../advisees/checklist/record.api'
import { saveTermGrades } from './encode.api'
import { GradeSelect } from '../GradeSelect'
import { outcomeRemark } from './grade-encoding'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type GradeData = Awaited<ReturnType<typeof import('../advisees/checklist/record.api').getGrades>>
function labelFor(attempt: ApiSchema<'AttemptResult'>, data: GradeData) {
  const offering = data.offerings.find(o => o.id === attempt.course_offering_id)
  const course = data.courses.find(c => c.id === offering?.course_id)
  return course ? `${course.code} · ${course.title}` : `Course ${attempt.course_offering_id}`
}
function PendingInc({ studentId, attempt, title, termLabel, studentName, onSaved }: { studentId: string; studentName?: string; attempt: ApiSchema<'AttemptResult'>; title: string; termLabel?: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false); const [grade, setGrade] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await completeInc(studentId, attempt, Number(grade), reason.trim()); setOpen(false); onSaved() }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete INC.') }
    finally { setBusy(false) }
  }
  const [code, ...courseName] = title.split(' · ')
  return <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4"><p><strong>{code}</strong>{courseName.length > 0 && <span className="mt-1 block text-xs text-muted-foreground">{courseName.join(' · ')}</span>}<span className="mt-2 block text-xs text-muted-foreground">{[termLabel, attempt.midterm_grade == null ? undefined : `Midterm ${attempt.midterm_grade.toFixed(2)}`, attempt.inc_deadline ? `Deadline ${attempt.inc_deadline}` : undefined].filter(Boolean).join(' · ')}</span></p>
    <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm">Resolve INC</Button></DialogTrigger><DialogContent className="gap-0 overflow-hidden p-0"><DialogHeader className="border-b p-5"><DialogTitle>Resolve INC</DialogTitle><DialogDescription>{title}{studentName && ` · ${studentName}`}</DialogDescription></DialogHeader>
      <form aria-label={`Complete INC for ${title}`} onSubmit={save}><div className="grid gap-4 p-5"><label className="grid gap-1">Completion grade<GradeSelect vsuScale required value={grade} onChange={e => setGrade(e.target.value)} /></label><label className="grid gap-1">Reason<textarea className="min-h-20 rounded-md border border-border px-3 py-2" placeholder="Required. This is written to the audit log." maxLength={2000} required value={reason} onChange={e => setReason(e.target.value)} /></label>{error && <p role="alert">{error}</p>}</div><div className="flex justify-end gap-2 border-t p-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy || !grade || !reason.trim()}>{busy ? 'Saving…' : 'Resolve INC'}</Button></div></form>
    </DialogContent></Dialog>
  </div>
}
function ExistingAttempt({ studentId, termId, attempt, title, onSaved }: { studentId: string; termId: string; attempt: ApiSchema<'AttemptResult'>; title: string; onSaved: () => void }) {
  const initialOutcome = outcomeRemark(attempt.recorded_status === 'dr' ? 'dr' : attempt.recorded_status === 'inc' && attempt.completion_grade == null ? 'inc' : (attempt.completion_grade ?? attempt.final_grade)?.toFixed(2) ?? '')
  const [midterm, setMidterm] = useState(''); const [final, setFinal] = useState(''); const [instructor, setInstructor] = useState(''); const [remark, setRemark] = useState(initialOutcome)
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [review, setReview] = useState(false)
  const changed = !!(midterm || final || instructor.trim() || remark.trim() !== initialOutcome)
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (!review) { setReview(true); return }
    setBusy(true)
    try {
      await saveTermGrades(studentId, termId, [{ attempt_id: attempt.id, course_offering_id: attempt.course_offering_id,
        ...(midterm === 'dr' ? { midterm_status: 'dr', status: 'dr' } : midterm ? { midterm_status: 'graded', midterm_grade: Number(midterm) } : {}),
        ...(final === 'inc' ? { status: 'inc' } : final === 'dr' ? { status: 'dr' } : final ? { final_grade: Number(final) } : {}),
        ...(instructor.trim() ? { instructor: instructor.trim() } : {}), ...(remark.trim() ? { remark: remark.trim() } : {}),
        continue_with_prerequisite_override: false }])
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save this attempt.') }
    finally { setBusy(false) }
  }
  const allowMidterm = attempt.midterm_grade == null && attempt.midterm_status !== 'dr' && attempt.recorded_status === 'currently_enrolled'
  const allowFinal = attempt.final_grade == null && attempt.completion_grade == null && attempt.recorded_status === 'currently_enrolled' && attempt.midterm_status !== 'dr'
  const displayedMidterm = attempt.midterm_status === 'dr' ? 'DR' : attempt.midterm_grade == null ? '—' : attempt.midterm_grade.toFixed(2)
  const displayedFinal = attempt.recorded_status === 'dr' ? 'DR' : attempt.recorded_status === 'inc' && attempt.completion_grade == null ? 'INC' : (attempt.completion_grade ?? attempt.final_grade)?.toFixed(2) ?? '—'
  const [code, ...name] = title.split(' · ')
  return <form aria-label={`Edit ${title}`} onSubmit={save} className="grid gap-3 border-b border-border px-3 py-2 sm:grid-cols-2 lg:grid-cols-[minmax(160px,2fr)_minmax(160px,2fr)_110px_110px_minmax(150px,2.8fr)_28px] lg:items-center"><div><strong>{code}</strong>{name.length > 0 && <span className="block text-xs text-muted-foreground">{name.join(' · ')}</span>}</div>
    {attempt.instructor ? <label><span className="sr-only">Instructor for {title}</span><select className="w-full rounded-md border border-border bg-card px-3 py-2" value={attempt.instructor} disabled><option>{attempt.instructor}</option></select></label> : <label><span className="sr-only">Instructor for {title}</span><input className="w-full rounded-md border border-border p-2" value={instructor} onChange={e=>{setInstructor(e.target.value);setReview(false)}} /></label>}
    {allowMidterm ? <label><span className="sr-only">New midterm grade</span><GradeSelect allowDrop placeholder="—" value={midterm} onChange={e=>{const value=e.target.value;setMidterm(value);if(value==='dr'){setFinal('dr');setRemark('DR')}else if(midterm==='dr'){setFinal('');setRemark('')}setReview(false)}} /></label> : <label><span className="sr-only">Midterm for {title}</span><GradeSelect allowDrop disabled placeholder="—" value={displayedMidterm === 'DR' ? 'dr' : displayedMidterm === '—' ? '' : displayedMidterm} /></label>}
    {allowFinal ? <label><span className="sr-only">New final grade</span><GradeSelect vsuScale includeStatuses disableDrop={midterm!=='dr'} disabled={midterm==='dr'} placeholder="—" value={final} onChange={e=>{setFinal(e.target.value);setRemark(outcomeRemark(e.target.value));setReview(false)}} /></label> : <label><span className="sr-only">Final for {title}</span><GradeSelect includeStatuses disabled placeholder="—" value={displayedFinal === 'DR' ? 'dr' : displayedFinal === 'INC' ? 'inc' : displayedFinal === '—' ? '' : displayedFinal} /></label>}
    <label><span className="sr-only">Staff remark</span><input className="w-full rounded-md border border-border p-2" value={remark} onChange={e=>{setRemark(e.target.value);setReview(false)}} /></label><span />
    <p className="sr-only">Previously recorded grades are changed through the grade correction workflow.</p>
    {review && <p className="sm:col-span-2 lg:col-span-6">Review this attempt for the selected student and term before confirming.</p>}{error && <p role="alert" className="sm:col-span-2 lg:col-span-6">{error}</p>}{changed && <div className="flex justify-end sm:col-span-2 lg:col-span-6"><Button disabled={busy} type="submit" size="sm">{busy ? 'Saving…' : review ? 'Confirm this attempt' : 'Review this attempt'}</Button></div>}
  </form>
}
export function PendingIncs({ data, studentId, onSaved }: { data: GradeData; studentId: string; onSaved: () => void }) {
  const pending = data.terms.flatMap(term => term.attempts).filter(a => a.recorded_status === 'inc' && a.completion_grade == null)
  return <Panel className="min-w-0 h-full mb-0 lg:col-start-2 lg:row-start-1" title="INC resolution" description="Pending incomplete grades for the advisee chosen in the card on the left.">{pending.length ? pending.map(a => { const term = data.terms.find(item => item.attempts.some(attempt => attempt.id === a.id)); return <PendingInc key={a.id} studentId={studentId} studentName={data.studentName} attempt={a} title={labelFor(a, data)} termLabel={term ? `${term.school_year} · ${term.term_type}` : undefined} onSaved={onSaved} /> }) : <p>No pending INC records.</p>}</Panel>
}
export function ExistingCourseRows({ data, studentId, termId, onSaved }: { data: GradeData; studentId: string; termId: string; isMockMode: boolean; onSaved: () => void }) {
  const existing = data.terms.find(term => term.school_term_id === termId)?.attempts ?? []
  return <>{existing.map(a => <ExistingAttempt key={a.id} studentId={studentId} termId={termId} attempt={a} title={labelFor(a, data)} onSaved={onSaved} />)}</>
}
