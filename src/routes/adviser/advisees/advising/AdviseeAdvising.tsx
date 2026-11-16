import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AdviserPage } from '../../Adviser'
import { useAuth } from '@/hooks/use-auth'
import { useScopedRequest } from '../use-scoped-request'
import { getAdvisingData, getAdvisingTerms, saveAdvisingPlan } from './advising.api'
import { addNote, getNotes } from '../notes/notes.api'
import { AdvisingAssistant } from './AdvisingAssistant'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Panel } from '@/components/features/panel'

type PlanData = Awaited<ReturnType<typeof getAdvisingData>>
function PlanEditor({ data, id, term, onSaved }: { data: PlanData; id: string; term: string; onSaved: () => void }) {
  const [selected, setSelected] = useState(data.items.map(item => ({ course_offering_id: item.course_offering_id, curriculum_term_course_id: item.curriculum_term_course_id })))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const recommendations = data.recommendations?.items ?? []
  const saved = data.items.filter(item => !recommendations.some(r => r.course_offering_id === item.course_offering_id))
  function toggle(offering: string, slot: string | null | undefined, checked: boolean) {
    setSelected(items => checked ? [...items, { course_offering_id: offering, curriculum_term_course_id: slot }] : items.filter(item => item.course_offering_id !== offering))
  }
  async function save() {
    if (!data.assignmentId) return
    setBusy(true); setError('')
    try { await saveAdvisingPlan(id, term, data.plan?.revision ?? null, data.assignmentId, selected); onSaved() }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save plan.') }
    finally { setBusy(false) }
  }
  return <>
    {saved.length > 0 && <div className="border-b border-border px-5 py-4"><p className="mb-2 text-sm font-semibold">Saved plan</p>{saved.map(item => {
      const offering = data.offerings.find(o => o.id === item.course_offering_id)
      const course = data.courses.find(c => c.id === offering?.course_id)
      return <label key={item.id} className="flex gap-3 py-1 text-sm"><input type="checkbox" checked={selected.some(s => s.course_offering_id === item.course_offering_id)} disabled={!data.canEdit} onChange={e => toggle(item.course_offering_id, item.curriculum_term_course_id, e.target.checked)} />{course ? `${course.code} · ${course.title}` : `Offering ${item.course_offering_id}`}</label>
    })}</div>}
    <>
      {recommendations.length ? <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="bg-[#F2EDDC] text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3"><span className="sr-only">Select</span></th><th className="px-3 py-3">Course</th><th className="px-3 py-3 text-right">Units</th><th className="px-5 py-3">Why recommended</th></tr></thead><tbody>{recommendations.map(r => <tr key={r.course_offering_id} className="border-t border-line-soft"><td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${r.code} ${r.title}`} checked={selected.some(s => s.course_offering_id === r.course_offering_id)} disabled={!data.canEdit} onChange={e => toggle(r.course_offering_id, r.curriculum_term_course_id, e.target.checked)} /></td><td className="px-3 py-4"><strong className="block">{r.code}</strong><span className="text-xs text-muted-foreground">{r.title}</span></td><td className="px-3 py-4 text-right">{r.units}</td><td className="px-5 py-4">{r.why}{r.badges.length > 0 && <span className="block text-xs text-muted-foreground">{r.badges.join(', ')}</span>}</td></tr>)}</tbody></table></div> : <p className="px-5 py-4 text-sm text-muted-foreground">No recommendations for this term.</p>}
      <div className="space-y-4 p-5">{data.recommendations.excluded !== null && <p className="rounded border border-[#EBDCAE] bg-[#FCF4E0] px-4 py-3 text-sm text-[#7A5406]">{data.recommendations.excluded} requirements or options excluded because of availability or prerequisites.</p>}<p className="text-sm text-muted-foreground">Failed requirements must be retaken. The student chooses the timing; dependent courses remain unavailable until their prerequisites pass.</p>{data.canEdit && <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{selected.length} selected</span><Button disabled={busy || !data.assignmentId} onClick={() => void save()}>{busy ? 'Saving…' : 'Add selected to plan'}</Button>{!data.assignmentId && <p className="text-sm">Current curriculum assignment unavailable.</p>}</div>}</div>
    </>
    {!data.canEdit && <p className="px-5 pb-5 text-sm">Historical record: read-only.</p>}{error && <p role="alert" className="px-5 pb-5 text-sm text-destructive">{error}</p>}
  </>
}

function RecentNotes({ id, userId, isAdmin }: { id: string; userId: string; isAdmin: boolean }) {
  const [revision, setRevision] = useState(0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const { data, error } = useScopedRequest(JSON.stringify([userId, id, revision]), true, () => getNotes(id))
  async function save() {
    if (!text.trim()) return
    const submitted = text
    setBusy(true); setSaveError(''); setMessage('')
    try { await addNote(id, submitted.trim()); setText(current => current === submitted ? '' : current); setMessage('Note added.'); setRevision(n => n + 1) }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'Unable to add note.') }
    finally { setBusy(false) }
  }
  const active = data?.notes.filter(note => !note.is_archived) ?? []
  return <Panel title="Advising notes" description="Recent notes · visible to the student" flush>
    {!data && !error && <p role="status" className="p-5 text-sm">Loading notes…</p>}
    {error && <div role="alert" className="space-y-3 p-5"><p>{error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></div>}
    {data && <>{active.slice(0, 3).map(note => <article key={note.id} className="border-b border-line-soft px-5 py-4"><div className="flex flex-wrap justify-between gap-2 text-xs"><strong>{note.author_name ?? 'Adviser'}</strong><time className="text-muted-foreground" dateTime={note.created_at}>{new Date(note.created_at).toLocaleDateString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{note.body_text}</p></article>)}
      {!active.length && <p className="px-5 py-4 text-sm text-muted-foreground">No active notes yet.</p>}
      <div className="space-y-3 p-5">{(data.isCurrent || isAdmin) && <><label htmlFor="advising-note" className="block text-sm font-medium">Write an advising note</label><Textarea id="advising-note" rows={4} maxLength={5000} placeholder="Visible to the student. Write what they and the next adviser should know." value={text} onChange={e => setText(e.target.value)} /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setText('')}>Cancel</Button><Button disabled={busy || !text.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save note'}</Button></div></>}
        {!data.isCurrent && !isAdmin && <p className="text-sm text-muted-foreground">Historical record: read-only.</p>}{message && <p role="status" className="text-sm">{message}</p>}{saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}<Link className="inline-block text-sm font-semibold text-primary underline" to={`/adviser/advisee/${encodeURIComponent(id)}/notes`}>View all notes</Link>
      </div></>}
  </Panel>
}

function AdvisingContent({ id, userId, isAdmin, isMockMode }: { id: string; userId: string; isAdmin: boolean; isMockMode: boolean }) {
  const [term, setTerm] = useState('')
  const termRef = useRef(term)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  const terms = useScopedRequest(JSON.stringify([userId, 'terms']), true, getAdvisingTerms)
  const data = useScopedRequest(JSON.stringify([userId, id, term, revision]), !!term, () => getAdvisingData(id, term))
  const selectedTerm = terms.data?.find(item => item.id === term)
  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]"><Panel title="Course recommendations" description={selectedTerm ? `${selectedTerm.school_year} · ${selectedTerm.term_type}` : 'Select a school term to review the plan.'} flush action={terms.data && <label className="grid gap-1 text-xs font-medium">Term<select aria-label="School term" className="max-w-48 rounded-md border border-border bg-white px-3 py-2 text-sm" value={term} onChange={e => { termRef.current = e.target.value; setTerm(e.target.value); setMessage('') }}><option value="">Select term</option>{terms.data.map(t => <option key={t.id} value={t.id}>{t.school_year} · {t.term_type}</option>)}</select></label>}>
    {terms.error && <p role="alert" className="p-5">{terms.error}</p>}{!terms.data && !terms.error && <p role="status" className="p-5">Loading terms…</p>}{terms.data && terms.data.length === 0 && <p className="p-5 text-sm text-muted-foreground">No school terms available.</p>}
    {!term && terms.data && terms.data.length > 0 && <div className="flex flex-wrap items-center gap-3 p-5"><span className="text-sm">0 selected</span><Button disabled>Add selected to plan</Button></div>}{term && !data.data && !data.error && <p role="status" className="p-5">Loading advising plan…</p>}{data.error && <div role="alert" className="space-y-3 p-5"><p>{data.error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></div>}{message && <p role="status" className="px-5 pt-4">{message}</p>}{data.data && <PlanEditor key={`${term}:${revision}`} data={data.data} id={id} term={term} onSaved={() => { if (termRef.current !== term) return; setMessage('Plan saved.'); setRevision(n => n + 1) }} />}
  </Panel><div className="min-w-0"><RecentNotes id={id} userId={userId} isAdmin={isAdmin} /><AdvisingAssistant key={`${userId}:${id}`} studentId={id} isMockMode={isMockMode} /></div></div>
}
export default function AdviseeAdvising() {
  const { id } = useParams<{ id: string }>()
  const { user, roles, isMockMode } = useAuth()
  return <AdviserPage title="Advising" tab="advising" sample={false}>{id && user && <AdvisingContent key={`${user.id}:${id}`} id={id} userId={user.id} isAdmin={roles.includes('admin')} isMockMode={isMockMode} />}</AdviserPage>
}
