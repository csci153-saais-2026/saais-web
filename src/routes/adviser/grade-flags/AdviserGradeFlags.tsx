import { useState } from 'react'
import { AdviserPage } from '../Adviser'
import { useAuth } from '@/hooks/use-auth'
import { useScopedRequest } from '../advisees/use-scoped-request'
import { getFlags, resolveFlag } from './grade-flags.api'
import { PageHeading } from '@/components/features/page-heading'
import { DataTablePanel } from '@/components/features/data-table-panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { ApiSchema } from '@/lib/api'
function Resolve({flag,attempt,student,course,onSaved}:{flag:ApiSchema<'GradeFlag'>;attempt:ApiSchema<'AttemptResult'>;student:string;course:string;onSaved:()=>void}){
  const [open,setOpen]=useState(false);const [action,setAction]=useState<'correct'|'reject'>('correct');const [grade,setGrade]=useState('');const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await resolveFlag(flag.id,{resolution_action:action,resolution_note:reason.trim(),expected_revision:attempt.revision,...(action==='correct'?{corrected_grade:Number(grade)}:{})});setOpen(false);onSaved()}catch(e){setError(e instanceof Error?e.message:'Unable to resolve flag.')}finally{setBusy(false)}}
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline">Review flag</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Review grade flag</DialogTitle><DialogDescription>{student} · {course} · {flag.reported_stage ?? 'grade'} · reported {flag.reported_grade_text ?? '—'}</DialogDescription></DialogHeader><p>{flag.details}</p><form className="grid gap-3" onSubmit={save}><label className="grid gap-1">Action<select className="rounded-md border px-3 py-2" value={action} onChange={e=>setAction(e.target.value as 'correct'|'reject')}><option value="correct">Correct grade</option><option value="reject">Reject</option></select></label>{action==='correct'&&<label className="grid gap-1">Corrected grade<input className="rounded-md border px-3 py-2" type="number" min="1" max="5" step="0.25" required value={grade} onChange={e=>setGrade(e.target.value)}/></label>}<label className="grid gap-1">Reply / reason<textarea className="rounded-md border px-3 py-2" required value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<Button disabled={busy||!reason.trim()}>{busy?'Saving…':'Submit resolution'}</Button></form></DialogContent></Dialog>
}
function FlagList({userId}:{userId:string}){
 const [revision,setRevision]=useState(0);const [message,setMessage]=useState('');const {data,error}=useScopedRequest(JSON.stringify([userId,revision]),true,getFlags)
 return <><PageHeading title="Grade flags" subtitle="Grades your current advisees reported."/>{!data&&!error&&<p role="status">Loading flags…</p>}{error&&<div role="alert"><p>{error}</p><Button onClick={()=>setRevision(n=>n+1)}>Try again</Button></div>}{message&&<p role="status">{message}</p>}{data&&<DataTablePanel title="Open flags" description={`${data.flags.length} open`} rows={data.flags} rowKey={r=>r.id} columns={[
 {header:'Student',cell:r=>{const student=data.roster.find(s=>s.student_id===r.student_id);return <>{student?.full_name ?? 'Unavailable'}<span className="block text-xs">{student?.student_number}</span></>}},
 {header:'Course',cell:r=>{const a=data.attempts.find(a=>a.id===r.attempt_id&&a.student_id===r.student_id);const o=data.offerings.find(o=>o.id===a?.course_offering_id);const c=data.courses.find(c=>c.id===o?.course_id);return c?`${c.code} · ${c.title}`:'Course unavailable'}},
 {header:'Reported grade',cell:r=>r.reported_grade_text??'—'},{header:'Comment',cell:r=>r.details},{header:'Raised',cell:r=>new Date(r.created_at).toLocaleDateString()},
 {header:'Action',cell:r=>{const a=data.attempts.find(a=>a.id===r.attempt_id&&a.student_id===r.student_id);const student=data.roster.find(s=>s.student_id===r.student_id);const o=data.offerings.find(o=>o.id===a?.course_offering_id);const c=data.courses.find(c=>c.id===o?.course_id);return a&&student?<Resolve key={r.id} flag={r} attempt={a} student={student.full_name} course={c?`${c.code} · ${c.title}`:'Course unavailable'} onSaved={()=>{setMessage('Flag resolved.');setRevision(n=>n+1)}}/>:'Attempt unavailable'}}
 ]}/> }</>
}
export default function AdviserGradeFlags(){const {user}=useAuth();return <AdviserPage title="Grade flags" sample={false}>{user&&<FlagList key={user.id} userId={user.id}/>}</AdviserPage>}
