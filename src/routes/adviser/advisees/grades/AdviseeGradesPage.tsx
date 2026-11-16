import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { AdviserPage } from '../../Adviser'
import { completeInc, correctGrade, correctIncCompletion, getIncResolution, getGrades } from '../checklist/record.api'
import { useScopedRequest } from '../use-scoped-request'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon, LockIcon, PencilIcon } from '@/components/icons'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Kicker } from '@/components/ui/kicker'
import { StatusBadge, type Status } from '@/components/ui/status-badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ApiSchema } from '@/lib/api'
import { GradeSelect } from '../../GradeSelect'

const statuses: Record<ApiSchema<'AttemptStatus'>, Status> = { passed:'passed', failed:'failed', inc:'inc', dr:'dr', na:'na', currently_enrolled:'enrolled' }
function GradeAction({ studentId, attempt, course, studentName, onSaved }: { studentId: string; attempt: ApiSchema<'AttemptResult'>; course: string; studentName?: string; onSaved: () => void }) {
  const inc = attempt.recorded_status === 'inc' && attempt.completion_grade == null
  const completedInc = attempt.recorded_status === 'inc' && attempt.completion_grade != null
  const [open, setOpen] = useState(false)
  const [grade, setGrade] = useState('')
  const [midterm, setMidterm] = useState('')
  const [finalGrade, setFinalGrade] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const resolution = useScopedRequest(JSON.stringify([studentId, attempt.id]), open && completedInc, () => getIncResolution(studentId, attempt.id))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true)
    try { if (inc) await completeInc(studentId, attempt, Number(grade), reason.trim()); else if (completedInc && resolution.data) await correctIncCompletion(studentId, attempt.id, Number(grade), reason.trim(), resolution.data.updated_at); else if (!completedInc && (midterm || finalGrade)) { if (midterm && finalGrade) await correctGrade(studentId, attempt, Number(midterm), reason.trim(), 'midterm', Number(finalGrade)); else await correctGrade(studentId, attempt, Number(midterm || finalGrade), reason.trim(), midterm ? 'midterm' : 'final') } else throw new Error('Select a grade to correct.'); setOpen(false); onSaved() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to save grade.') }
    finally { setSaving(false) }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm" className={inc ? 'border-status-inc bg-status-inc-bg text-status-inc hover:bg-status-inc-bg/80' : attempt.effective_status === 'passed' ? 'border-status-enrolled bg-status-enrolled-bg text-status-enrolled hover:bg-status-enrolled-bg/80' : undefined}>{inc ? 'Resolve INC' : 'Correct grade'}</Button></DialogTrigger><DialogContent className="gap-0 overflow-hidden p-0"><DialogHeader className="border-b p-5"><DialogTitle>{inc ? 'Resolve INC' : completedInc ? 'Correct completion grade' : 'Correct grade'}</DialogTitle><DialogDescription>{course}{studentName && ` · ${studentName}`}{inc && attempt.inc_deadline ? ` · Deadline ${attempt.inc_deadline}` : ''}</DialogDescription></DialogHeader>
    {completedInc && !resolution.data && !resolution.error && <p role="status">Loading completion…</p>}{resolution.error && <p role="alert">{resolution.error}</p>}
    <form onSubmit={submit}><div className="grid gap-4 p-5">{inc || completedInc ? <label className="grid gap-1">Completion grade<GradeSelect vsuScale required value={grade} onChange={e=>setGrade(e.target.value)} /></label> : <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1">Midterm grade<GradeSelect vsuScale value={midterm} onChange={e=>setMidterm(e.target.value)} /></label><label className="grid gap-1">Final grade<GradeSelect vsuScale value={finalGrade} onChange={e=>setFinalGrade(e.target.value)} /></label></div>}<label className="grid gap-1">{inc || completedInc ? 'Reason' : 'Reason for change'}<textarea className="min-h-20 rounded-md border border-border px-3 py-2" placeholder="Required. This is written to the audit log." required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} /></label>{error && <p role="alert">{error}</p>}</div><div className="flex justify-end gap-2 border-t bg-muted/40 p-4"><Button type="button" variant="ghost" disabled={saving} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={saving || !reason.trim() || (completedInc && !resolution.data) || (inc || completedInc ? !grade : !midterm && !finalGrade)} type="submit">{saving ? 'Saving…' : 'Save grade'}</Button></div></form>
  </DialogContent></Dialog>
}
export default function AdviseeGradesPage() {
  const { id } = useParams<{id:string}>(); const { user } = useAuth()
  const [revision, setRevision] = useState(0); const [saved, setSaved] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const key = JSON.stringify([user?.id, id, revision])
  const { data, error } = useScopedRequest(key, !!user?.id && !!id, () => getGrades(id!))
  const allCollapsed = !!data?.terms.length && data.terms.every(term => collapsed.has(term.school_term_id))
  return <AdviserPage title="Grades" tab="grades" sample={false}>
    {saved === JSON.stringify([user?.id,id]) && <p role="status">Grade saved.</p>}
    {!data && !error && <p role="status">Loading grades…</p>}
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={()=>setRevision(n=>n+1)}>Try again</Button></div>}
    {data && <>{!data.canEdit && <p className="mb-4">Historical record: read-only.</p>}
      <div className="mb-4 flex flex-wrap justify-end gap-3">
        {!!data.terms.length && <Button variant="outline" onClick={()=>setCollapsed(allCollapsed ? new Set() : new Set(data.terms.map(t=>t.school_term_id)))}>{allCollapsed ? 'Expand all' : 'Collapse all'}</Button>}
        {data.canEdit && id && <Button asChild><Link to={`/adviser/encode-grades?student=${encodeURIComponent(id)}`}><PencilIcon />Encode grades</Link></Button>}
      </div>
      {!data.terms.length && <p>No grades recorded.</p>}
      {data.terms.map(term=>{
        const schoolTerm=data.schoolTerms?.find(item=>item.id===term.school_term_id)
        const totalUnits=term.attempts.reduce((sum,attempt)=>sum+attempt.units_attempted,0)
        const passedUnits=term.attempts.filter(attempt=>attempt.effective_status==='passed').reduce((sum,attempt)=>sum+attempt.units_attempted,0)
        const failedUnits=term.attempts.filter(attempt=>(attempt.completion_grade ?? attempt.final_grade ?? (attempt.is_lapsed_inc ? 5 : 0))>3).reduce((sum,attempt)=>sum+attempt.units_attempted,0)
        return <Collapsible key={term.school_term_id} open={!collapsed.has(term.school_term_id)} onOpenChange={open=>setCollapsed(previous=>{const next=new Set(previous);if(open)next.delete(term.school_term_id);else next.add(term.school_term_id);return next})} className="mb-4 overflow-hidden rounded-md border border-border bg-card">
          <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-secondary/40">
            <span className="min-w-0 flex-1"><span className="block font-semibold">{term.school_year} · {term.term_type}</span><span className="mt-1 block text-xs text-muted-foreground">Term GWA {term.gwa?.toFixed(2) ?? '—'} · {failedUnits} failed units{schoolTerm ? schoolTerm.is_locked ? schoolTerm.override_flag ? ' · Locked term (override active)' : ' · Locked term' : ' · Open term' : ''}{schoolTerm?.is_locked && <LockIcon className="ml-1 inline-block size-3" />}</span></span>
            <span className="flex items-center gap-5 text-right sm:gap-7"><span><Kicker className="block text-[10px]">Passed units</Kicker><span className="font-heading font-bold text-primary">{passedUnits}/{totalUnits}</span></span><span><Kicker className="block text-[10px]">Total units</Kicker><span className="font-heading font-bold text-primary">{totalUnits}</span></span><span><Kicker className="block text-[10px]">Semester GWA</Kicker><span className="font-heading font-bold text-primary">{term.gwa?.toFixed(2) ?? '—'}</span></span><ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${collapsed.has(term.school_term_id) ? '-rotate-90' : ''}`} aria-hidden /></span>
          </CollapsibleTrigger>
          <CollapsibleContent><Table responsive className="md:min-w-[900px] md:table-fixed"><colgroup className="hidden md:table-column-group"><col style={{width:'36%'}}/><col style={{width:'5%'}}/><col style={{width:'10%'}}/><col style={{width:'18%'}}/><col style={{width:'14%'}}/><col style={{width:'17%'}}/></colgroup><TableHeader className="bg-secondary"><TableRow>{['Course','Units','Midterm','Final / completion','Status','Action'].map(header=><TableHead key={header} className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">{header}</TableHead>)}</TableRow></TableHeader><TableBody>
            {term.attempts.map(r=>{const o=data.offerings.find(o=>o.id===r.course_offering_id);const c=data.courses.find(c=>c.id===o?.course_id);return <TableRow key={r.id}>
              <TableCell label="Course"><b className="block">{c?.code ?? 'Course unavailable'}</b><span className="text-xs text-muted-foreground">{c?.title ?? r.course_offering_id}</span></TableCell><TableCell label="Units">{r.units_attempted}</TableCell><TableCell label="Midterm">{r.midterm_grade ?? r.midterm_status ?? '—'}</TableCell><TableCell label="Final / completion">{r.completion_grade ?? r.final_grade ?? '—'}</TableCell>
              <TableCell label="Status"><StatusBadge status={statuses[r.effective_status]} />{r.is_lapsed_inc && <span className="block">INC lapsed</span>}{r.is_repeated && <span className="block">Repeated · excluded from cumulative GWA</span>}</TableCell>
              <TableCell label="Action">{data.canEdit ? <GradeAction key={`${user?.id}:${id}:${r.id}`} studentId={id!} studentName={data.studentName} attempt={r} course={c ? `${c.code} · ${c.title}` : r.course_offering_id} onSaved={()=>{setSaved(JSON.stringify([user?.id,id]));setRevision(n=>n+1)}} /> : '—'}</TableCell>
            </TableRow>})}
          </TableBody></Table></CollapsibleContent>
        </Collapsible>
      })}
    </>}
  </AdviserPage>
}
