import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AdviserPage } from '../Adviser'
import { getRoster } from './advisees.api'
import { useScopedRequest } from './use-scoped-request'
import { useAuth } from '@/hooks/use-auth'
import { PageHeading } from '@/components/features/page-heading'
import { DataTablePanel } from '@/components/features/data-table-panel'
import { FormField } from '@/components/features/form-field'
import { SearchInput } from '@/components/features/search-input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { DeficiencySubjects } from './DeficiencySubjects'

export default function AdviseesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'current' | 'past'>('current')
  const [standing, setStanding] = useState('all')
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([user?.id, scope, search, revision])
  const { data, error } = useScopedRequest(key, !!user?.id, () => getRoster(scope, search))
  const rows = data?.filter(row => standing === 'all' || (standing === 'flagged' ? (row.is_delinquent ?? row.standing !== 'good_standing') : !(row.is_delinquent ?? row.standing !== 'good_standing')))
  return <AdviserPage title="Advisees" sample={false}>
    <PageHeading title="Know your students." subtitle="Search current and past advisees. Historical records remain read-only." />
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
      <FormField label="Search advisees" htmlFor="advisee-search" className="flex-1"><SearchInput id="advisee-search" placeholder="Name or student number" value={search} onChange={e => setSearch(e.target.value)} /></FormField>
      <FormField label="Standing" htmlFor="standing" className="md:w-56"><select id="standing" className="w-full rounded-md border border-input bg-card px-3 py-2" value={standing} onChange={e => setStanding(e.target.value)}><option value="all">All standings</option><option value="flagged">Delinquency flags</option><option value="good">Good standing</option></select></FormField>
      <div className="flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Advisee assignment">{(['current', 'past'] as const).map(value => <Button key={value} size="sm" variant={scope === value ? 'default' : 'ghost'} aria-pressed={scope === value} onClick={() => setScope(value)}>{value === 'current' ? 'Current' : 'Past'}</Button>)}</div>
    </div>
    {!data && !error && <p role="status">Loading advisees…</p>}
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></div>}
    {rows && <DataTablePanel title="Advisees" description={`${rows.length} matching records`} rows={rows} rowKey={r => r.student_id} rowProps={r => ({ tabIndex: 0, 'aria-label': `Open ${r.full_name}'s record`, className: 'cursor-pointer hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]', onClick: event => { if (!(event.target as HTMLElement).closest('a,button,input,select,textarea')) navigate(`/adviser/advisee/${encodeURIComponent(r.student_id)}/checklist`) }, onKeyDown: event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); navigate(`/adviser/advisee/${encodeURIComponent(r.student_id)}/checklist`) } } })} columns={[
      { header: 'Student', cell: r => <><Link to={`/adviser/advisee/${encodeURIComponent(r.student_id)}/checklist`} className="font-semibold underline">{r.full_name}</Link><span className="block font-mono text-xs text-muted-foreground">{r.student_number}</span></> },
      { header: 'Program', cell: r => <>{r.program_name}<span className="block text-xs text-muted-foreground">Curriculum {r.curriculum_label}</span></> },
      { header: 'Year standing', cell: r => `Year ${r.year_level}` }, { header: 'GWA', numeric: true, cell: r => r.gwa == null ? '—' : r.gwa.toFixed(2) }, { header: 'Open flags', numeric: true, cell: r => r.open_flags_count }, { header: 'Standing', cell: r => <StatusBadge status={r.is_delinquent ? 'delinquent' : r.standing === 'good_standing' ? 'good' : 'flagged'}>{r.is_delinquent ? 'Delinquency flag' : r.standing.replaceAll('_', ' ')}</StatusBadge> }, { header: 'Deficiencies', cell: r => <DeficiencySubjects userId={user!.id} studentId={r.student_id} count={r.deficiencies_count} /> },
    ]} footer="Past advisees are read-only. Their records stay with their current adviser." />}
  </AdviserPage>
}
