import { useState } from 'react'
import { useParams } from 'react-router'
import { AdviserPage } from '../../Adviser'
import { useAuth } from '@/hooks/use-auth'
import { useScopedRequest } from '../use-scoped-request'
import { getStudentHistory } from './history.api'
import { DataTablePanel } from '@/components/features/data-table-panel'
import { Button } from '@/components/ui/button'

export default function AdviseeHistory() {
  const { id } = useParams<{id:string}>(); const { user, activeRole } = useAuth()
  const [filter, setFilter] = useState<'all' | 'student' | 'adviser'>('all'); const [revision, setRevision] = useState(0)
  const [search, setSearch] = useState('')
  const { data, error } = useScopedRequest(JSON.stringify([user?.id, activeRole, id, revision]), !!user?.id && !!id, () => getStudentHistory(id!))
  const rows = data?.filter(row => (filter === 'all' || (filter === 'student' ? row.actor_id === id : row.actor_role === 'adviser')) && [row.actor_name, row.action, row.details_summary, row.actor_role].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())))
  return <AdviserPage title="Audit log" tab="history" sample={false}>
    {!data && !error && <p role="status">Loading history…</p>}{error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={()=>setRevision(n=>n+1)}>Try again</Button></div>}
    {rows && <DataTablePanel title="Audit log" description="Authorized history for this student. Entries cannot be edited." action={<div className="flex flex-wrap gap-2"><input type="search" aria-label="Search the audit log" placeholder="Search the log" className="w-52 rounded-md border border-border bg-background px-3 py-2 text-sm" value={search} onChange={event=>setSearch(event.target.value)} /><select aria-label="Filter by actor" className="rounded-md border border-border bg-background px-3 py-2 text-sm" value={filter} onChange={event=>setFilter(event.target.value as typeof filter)}><option value="all">All actions</option><option value="student">Advisee actions</option><option value="adviser">Adviser actions</option></select></div>} rows={rows} rowKey={row=>row.id} columns={[
      {header:'Date and time',cell:row=><time>{new Date(row.created_at).toLocaleString()}</time>}, {header:'Actor',cell:row=>row.actor_name ?? 'System'}, {header:'Action',cell:row=><b>{row.action}</b>}, {header:'Details',cell:row=>row.details_summary ?? '—'},
    ]} footer={`${rows.length} ${rows.length===1?'entry':'entries'}`} />}
  </AdviserPage>
}
