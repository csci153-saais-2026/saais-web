import { useState } from 'react'
import { useParams } from 'react-router'
import { AdviserPage } from '../../Adviser'
import { getChecklist } from './record.api'
import { useScopedRequest } from '../use-scoped-request'
import { useAuth } from '@/hooks/use-auth'
import { StatGrid } from '@/components/features/stat-tile'
import { Button } from '@/components/ui/button'
import { ChevronDownIcon } from '@/components/icons'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Kicker } from '@/components/ui/kicker'
import { StatusBadge, type Status } from '@/components/ui/status-badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ApiSchema } from '@/lib/api'

const statusMap: Record<ApiSchema<'ChecklistSlotResult'>['status'], Status> = { not_taken: 'not-taken', currently_enrolled: 'enrolled', passed: 'passed', failed: 'failed', inc: 'inc', dr: 'dr', na: 'na' }
function yearStanding(year: number | undefined) {
  if (year == null) return '—'
  const suffix = new Intl.PluralRules('en', { type: 'ordinal' }).select(year)
  return `${year}${suffix === 'one' ? 'st' : suffix === 'two' ? 'nd' : suffix === 'few' ? 'rd' : 'th'} year`
}
function AttemptDetails({ row, title }: { row: ApiSchema<'ChecklistSlotResult'>; title: string }) {
  return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm">Course info</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Requirement and attempt history</DialogDescription></DialogHeader>
    <p>{row.earned_units} / {row.required_units} units · {row.satisfaction_source ?? 'No credited source'}</p>
    {row.credited_course_code && <p>Credited: {row.credited_course_code} {row.credited_course_title}</p>}
    {row.attempts?.length ? <ul className="space-y-3">{row.attempts.map(a => <li key={a.attempt_id} className="border-b pb-2"><strong>{a.term_label}</strong><p>Midterm: {a.midterm_grade ?? a.midterm_status ?? '—'} · Final: {a.final_grade ?? a.recorded_status} · Completion: {a.completion_grade ?? '—'}</p><p>Instructor: {a.instructor || 'Not recorded'}{a.inc_deadline && ` · INC deadline: ${a.inc_deadline}`}</p></li>)}</ul> : <p>No attempts recorded.</p>}
    {!!row.grade_fix_history?.length && <div><h3 className="font-semibold">Grade fix history</h3><ul>{row.grade_fix_history.map((entry, index) => <li key={`${entry.changed_at}:${index}`}>{new Date(entry.changed_at).toLocaleString()} · {entry.old_grade ?? '—'} → {entry.new_grade ?? '—'}</li>)}</ul></div>}
  </DialogContent></Dialog>
}
export default function AdviseeChecklist() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [revision, setRevision] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const key = JSON.stringify([user?.id, id, revision])
  const { data, error } = useScopedRequest(key, !!user?.id && !!id, () => getChecklist(id!))
  const matchesFilter = (row: ApiSchema<'ChecklistSlotResult'>) => filter === 'all' || row.status === filter
  const groups = new Map<string, ApiSchema<'ChecklistSlotResult'>[]>()
  for (const row of data?.results ?? []) {
    const slot = data?.slots.find(s => s.id === row.curriculum_term_course_id)
    const term = data?.terms.find(t => t.id === slot?.curriculum_term_id)
    const label = term ? `Year ${term.year_level} · Semester ${term.term_sequence}` : 'Other requirements'
    groups.set(label, [...(groups.get(label) ?? []), row])
  }
  const visibleGroups = [...groups].filter(([, items]) => items.some(matchesFilter)).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}))
  const allCollapsed = visibleGroups.length > 0 && visibleGroups.every(([label]) => !expanded.has(label))
  return <AdviserPage title="Checklist" tab="checklist" sample={false}>
    {!data && !error && <p role="status">Loading checklist…</p>}
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></div>}
    {data && <><StatGrid items={[
      {label:'Cumulative GWA', value:data.summary.gwa?.toFixed(2) ?? '—', note:'Unit-weighted counted attempts'},
      {label:'Counted units', value:data.summary.counted_units ?? '—', valueSuffix:`/ ${data.summary.required_units}`, note:`Of ${data.summary.required_units} total units. Excludes unresolved, unexpired INC`},
      {label:'Year Standing', value:yearStanding(data.summary.year_level), note:`${data.summary.earned_units} of ${data.summary.required_units} units earned`},
      {label:'Deficiencies', value:data.summary.deficiencies_count ?? '—', note:data.summary.deficiencies?.map(item=>`${item.kind.replaceAll('_',' ')}: ${item.course_code}`).join(' · ')},
    ]} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="grid w-56 gap-1 text-sm">Show requirements<select className="rounded-md border border-input bg-background px-3 py-2" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option><option value="not_taken">Not yet taken</option><option value="passed">Passed / credited</option><option value="inc">INC</option><option value="currently_enrolled">Currently enrolled</option><option value="failed">Failed</option></select></label><Button variant="outline" className="ml-auto" disabled={visibleGroups.length === 0} onClick={() => setExpanded(previous => { const next = new Set(previous); for (const [label] of visibleGroups) { if (allCollapsed) next.add(label); else next.delete(label) } return next })}>{allCollapsed ? 'Expand All' : 'Collapse All'}</Button></div>
      {!visibleGroups.length && <p>No requirements match this filter.</p>}
      {visibleGroups.map(([label, items]) => {
        const passedUnits = items.reduce((sum, item) => sum + item.earned_units, 0)
        const totalUnits = items.reduce((sum, item) => sum + item.required_units, 0)
        return <Collapsible key={label} open={expanded.has(label)} onOpenChange={open=>setExpanded(previous=>{const next=new Set(previous);if(open)next.add(label);else next.delete(label);return next})} className="mb-4 overflow-hidden rounded-md border border-border bg-card">
          <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left hover:bg-secondary/40">
            <span className="min-w-0 flex-1"><span className="block font-semibold">{label}</span><span className="mt-1 block text-xs text-muted-foreground">Curriculum position · course availability depends on the school term.</span></span>
            <span className="flex items-center gap-5 text-right sm:gap-7">
              <span><Kicker className="block text-[10px]">Passed units</Kicker><span className="font-heading font-bold text-primary">{passedUnits}/{totalUnits}</span></span>
              <span><Kicker className="block text-[10px]">Total units</Kicker><span className="font-heading font-bold text-primary">{totalUnits}</span></span>
              <span><Kicker className="block text-[10px]">Semester GWA</Kicker><span className="font-heading font-bold text-primary" aria-label="Semester GWA unavailable">—</span></span>
              <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${expanded.has(label) ? '' : '-rotate-90'}`} aria-hidden />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent><Table responsive><TableHeader className="bg-secondary"><TableRow>{['Requirement','Units earned / required','Status','Satisfaction source','Attempts','Course info'].map(header=><TableHead key={header} className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">{header}</TableHead>)}</TableRow></TableHeader><TableBody>
            {items.filter(matchesFilter).map(r=>{const slot=data.slots.find(s=>s.id===r.curriculum_term_course_id);const course=data.courses.find(c=>c.id===slot?.course_id);const title=course ? `${course.code} · ${course.title}` : slot?.slot_label ?? 'Requirement';const sourceAttempt=r.attempts?.find(attempt=>attempt.attempt_id===r.source_attempt_id);const sourceGrade=sourceAttempt?.completion_grade ?? sourceAttempt?.final_grade;return <TableRow key={r.curriculum_term_course_id}>
              <TableCell label="Requirement"><b className="block">{course?.code ?? slot?.slot_label ?? 'Requirement unavailable'}</b><span className="text-xs text-muted-foreground">{course?.title ?? (slot ? 'Elective requirement' : r.curriculum_term_course_id)}</span></TableCell>
              <TableCell label="Units earned / required">{r.earned_units} / {r.required_units}</TableCell><TableCell label="Status"><StatusBadge status={statusMap[r.status]} /></TableCell>
              <TableCell label="Satisfaction source">{r.satisfaction_source ?? '—'}{(r.credited_course_code || sourceGrade != null) && <span className="block text-xs text-muted-foreground">{r.credited_course_code}{r.credited_course_code && sourceGrade != null ? ' · ' : ''}{sourceGrade != null ? `grade ${sourceGrade.toFixed(2)}` : ''}</span>}</TableCell>
              <TableCell label="Attempts">{r.attempts?.length ? `${r.attempts.length} ${r.attempts.length === 1 ? 'attempt' : 'attempts'}` : '—'}</TableCell><TableCell label="Course info"><AttemptDetails row={r} title={title} /></TableCell>
            </TableRow>})}
          </TableBody></Table></CollapsibleContent>
        </Collapsible>
      })}
    </>}
  </AdviserPage>
}
