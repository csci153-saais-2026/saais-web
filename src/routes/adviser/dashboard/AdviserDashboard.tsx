import { useState } from 'react'
import { Link } from 'react-router'
import { AdviserPage } from '../Adviser'
import { useAuth } from '@/hooks/use-auth'
import { PageHeading } from '@/components/features/page-heading'
import { StatGrid } from '@/components/features/stat-tile'
import { Panel } from '@/components/features/panel'
import { DataTablePanel } from '@/components/features/data-table-panel'
import { GradeDistribution } from '@/components/features/grade-distribution'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAdviserDashboard } from './use-adviser-dashboard'

export default function AdviserDashboard() {
  const { user, isMockMode } = useAuth()
  const [termId, setTermId] = useState('')
  const [revision, setRevision] = useState(0)
  const { report, terms, error, loading } = useAdviserDashboard(user?.id, termId, revision)

  return <AdviserPage title="Dashboard" sample={false}>
    <PageHeading title="Dashboard" subtitle="Your advisees at a glance." />
    {isMockMode && <p className="mb-4 text-sm text-muted-foreground">Showing shared sample records.</p>}
    {loading && <p role="status">Loading adviser dashboard…</p>}
    {error && <div role="alert" className="grid gap-3"><p>{error}</p><div><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Try again</Button></div></div>}
    {report && <>
      <StatGrid className="lg:grid-cols-3" items={[
        { label: 'Students', value: String(report.total_advisees), note: 'Assigned to you' },
        { label: 'Mean GWA', value: report.mean_gwa == null ? '—' : report.mean_gwa.toFixed(2), note: 'Across your advisees' },
        { label: 'With deficiencies', value: report.advisees_with_deficiencies ? String(report.advisees_with_deficiencies.length) : '—', note: report.advisees_with_deficiencies ? <Dialog><DialogTrigger className="text-left text-sm text-primary hover:underline">Students with open deficiencies · View list</DialogTrigger><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>Advisees with deficiencies</DialogTitle><DialogDescription>Review the listed student records.</DialogDescription></DialogHeader><ul className="divide-y divide-line-soft">{report.advisees_with_deficiencies.map(student => <li key={student.student_id} className="py-3"><b className="block">{student.full_name}</b><span className="text-xs text-muted-foreground">{student.student_number}</span><span className="block text-sm">{student.deficiencies.map(item => item.course_code).join(', ')}</span></li>)}</ul></DialogContent></Dialog> : 'Details not available in this report' },
      ]} />
      <div className="grid items-start gap-grid xl:grid-cols-[1fr_1.2fr]">
        <Panel title="Final grade distribution" description="Share of final grades across your advisees" action={<label className="grid gap-1 text-sm">Term<select className="rounded-md border border-border bg-background px-3 py-2" value={termId} onChange={event => setTermId(event.target.value)}><option value="">All terms</option>{terms.map(term => <option key={term.id} value={term.id}>{term.school_year} · {term.term_type}</option>)}</select></label>}>
          {report.grade_distribution ? <GradeDistribution bands={report.grade_distribution.buckets.map(bucket => ({ label: bucket.label, percent: bucket.percentage, detail: `${bucket.count} grades` }))} /> : <p className="text-sm text-muted-foreground">Grade distribution is not available in this report.</p>}
        </Panel>
        <DataTablePanel title="GWA by batch and curriculum version" description="Mean GWA by advisee batch and curriculum." rows={report.batch_curriculum_gwa ?? []} rowKey={row => `${row.entry_year}-${row.curriculum_version_id}`} empty="Batch results are not available in this report." columns={[
          { header: 'Batch', cell: row => row.entry_year },
          { header: 'Curriculum', cell: row => row.curriculum_label },
          { header: 'Students', numeric: true, cell: row => row.student_count },
          { header: 'Mean GWA', numeric: true, cell: row => row.mean_gwa == null ? '—' : row.mean_gwa.toFixed(2) },
        ]} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground"><Link to="/adviser/advisees" className="underline">View advisees</Link></p>
    </>}
  </AdviserPage>
}
