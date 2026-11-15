import { useState } from 'react'
import type { ApiSchema } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/features/panel'
import { completeInc } from '../advisees/checklist/record.api'
import { saveTermGrades } from './encode.api'

type GradeData = Awaited<ReturnType<typeof import('../advisees/checklist/record.api').getGrades>>
function labelFor(attempt: ApiSchema<'AttemptResult'>, data: GradeData) {
  const offering = data.offerings.find(o => o.id === attempt.course_offering_id)
  const course = data.courses.find(c => c.id === offering?.course_id)
  return course ? `${course.code} · ${course.title}` : `Course ${attempt.course_offering_id}`
}
const valid = (s: string) => s === '' || (Number.isFinite(Number(s)) && Number(s) >= 1 && Number(s) <= 5 && Number(s) * 4 % 1 === 0)
function PendingInc({ studentId, attempt, title, onSaved }: { studentId: string; attempt: ApiSchema<'AttemptResult'>; title: string; onSaved: () => void }) {
  const [grade, setGrade] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setBusy(true)
    try { await completeInc(studentId, attempt, Number(grade), reason.trim()); onSaved() }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to complete INC.') }
    finally { setBusy(false) }
  }
  return <form aria-label={`Complete INC for ${title}`} className="grid gap-3 border-b py-3" onSubmit={save}><p><strong>{title}</strong>{attempt.inc_deadline && ` · Deadline ${attempt.inc_deadline}`}</p>
    <label className="grid gap-1">Completion grade<input className="rounded-md border px-3 py-2" type="number" min="1" max="5" step="0.25" required value={grade} onChange={e => setGrade(e.target.value)} /></label>
    <label className="grid gap-1">Reason<textarea className="rounded-md border px-3 py-2" maxLength={2000} required value={reason} onChange={e => setReason(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}<div><Button type="submit" disabled={busy || !reason.trim()}>{busy ? 'Saving…' : 'Complete INC'}</Button></div>
  </form>
}
function ExistingAttempt({ studentId, termId, attempt, title, onSaved }: { studentId: string; termId: string; attempt: ApiSchema<'AttemptResult'>; title: string; onSaved: () => void }) {
  const [midterm, setMidterm] = useState(''); const [final, setFinal] = useState(''); const [instructor, setInstructor] = useState(''); const [remark, setRemark] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [review, setReview] = useState(false)
  const changed = !!(midterm || final || instructor.trim() || remark.trim())
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError('')
    if (!review) { setReview(true); return }
    setBusy(true)
    try {
      await saveTermGrades(studentId, termId, [{ attempt_id: attempt.id, course_offering_id: attempt.course_offering_id,
        ...(midterm ? { midterm_status: 'graded', midterm_grade: Number(midterm) } : {}), ...(final ? { final_grade: Number(final) } : {}),
        ...(instructor.trim() ? { instructor: instructor.trim() } : {}), ...(remark.trim() ? { remark: remark.trim() } : {}),
        continue_with_prerequisite_override: false }])
      onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save this attempt.') }
    finally { setBusy(false) }
  }
  const allowFinal = attempt.final_grade == null && attempt.completion_grade == null && attempt.recorded_status === 'currently_enrolled' && attempt.midterm_status !== 'dr'
  return <form aria-label={`Edit ${title}`} className="grid gap-3 border-b py-4" onSubmit={save}><strong>{title}</strong>
    <p className="text-sm">Status: {attempt.effective_status.replaceAll('_', ' ')} · Midterm: {attempt.midterm_grade ?? attempt.midterm_status ?? '—'} · Final: {attempt.completion_grade ?? attempt.final_grade ?? '—'}</p>
    {attempt.midterm_grade == null && attempt.midterm_status !== 'dr' && <label className="grid gap-1">New midterm grade<input type="number" min="1" max="5" step="0.25" className="rounded-md border p-2" value={midterm} onChange={e => { setMidterm(e.target.value); setReview(false) }} /></label>}
    {allowFinal && <label className="grid gap-1">New final grade<input type="number" min="1" max="5" step="0.25" className="rounded-md border p-2" value={final} onChange={e => { setFinal(e.target.value); setReview(false) }} /></label>}
    {!attempt.instructor && <label className="grid gap-1">Instructor<input className="rounded-md border p-2" value={instructor} onChange={e => { setInstructor(e.target.value); setReview(false) }} /></label>}
    <label className="grid gap-1">Staff remark<input className="rounded-md border p-2" value={remark} onChange={e => { setRemark(e.target.value); setReview(false) }} /></label>
    <p className="text-xs text-muted-foreground">Previously recorded grades are changed through the grade correction workflow.</p>
    {review && <p>Review this attempt for the selected student and term before confirming.</p>}
    {error && <p role="alert">{error}</p>}<div><Button disabled={busy || !changed || !valid(midterm) || !valid(final)} type="submit">{busy ? 'Saving…' : review ? 'Confirm this attempt' : 'Review this attempt'}</Button></div>
  </form>
}
export function ExistingGrades({ data, studentId, termId, isMockMode, onSaved }: { data: GradeData; studentId: string; termId: string; isMockMode: boolean; onSaved: () => void }) {
  const pending = data.terms.flatMap(term => term.attempts).filter(a => a.recorded_status === 'inc' && a.completion_grade == null)
  const existing = data.terms.find(term => term.school_term_id === termId)?.attempts ?? []
  return <><Panel title="INC resolution" description="Unresolved INCs for the selected advisee, including earlier terms.">{pending.length ? pending.map(a => <PendingInc key={a.id} studentId={studentId} attempt={a} title={labelFor(a, data)} onSaved={onSaved} />) : <p>No pending INC records.</p>}</Panel>
    <Panel title="Existing attempts" description="Grades already recorded for the selected term.">{!existing.length && <p>No existing attempts for this term.</p>}{existing.map(a => isMockMode ? <p key={a.id} className="border-b py-2">{labelFor(a, data)} · {a.effective_status.replaceAll('_', ' ')} · final {a.completion_grade ?? a.final_grade ?? '—'}</p> : <ExistingAttempt key={a.id} studentId={studentId} termId={termId} attempt={a} title={labelFor(a, data)} onSaved={onSaved} />)}</Panel></>
}
