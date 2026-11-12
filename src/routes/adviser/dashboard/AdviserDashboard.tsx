import { Link } from "react-router"
import { AdviserPage, StaticSelect, recordPath } from "../Adviser"
import { advisees, adviserGradeBands, adviserBatchGwas } from "@/mocks/adviser.mock"
import { PageHeading } from "@/components/features/page-heading"
import { StatGrid } from "@/components/features/stat-tile"
import { Panel } from "@/components/features/panel"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { GradeDistribution } from "@/components/features/grade-distribution"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DownloadIcon } from "@/components/icons"

export default function AdviserDashboard() {
  return <AdviserPage title="Dashboard">
    <PageHeading title="Dashboard" subtitle="Your advisees at a glance." actions={<Button variant="outline" type="button"><DownloadIcon />Export PDF</Button>} />
    <StatGrid className="lg:grid-cols-3" items={[
      { label: "Students", value: "5", note: "Assigned to you" },
      { label: "Mean GWA", value: "1.98", note: "Across your advisees" },
      { label: "With deficiencies", value: "4", note: <Dialog><DialogTrigger className="text-left text-sm text-primary hover:underline">Students with open deficiencies · View list</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Advisees with deficiencies</DialogTitle><DialogDescription>Select an advisee to open their record.</DialogDescription></DialogHeader><ul className="divide-y divide-line-soft">{advisees.filter(s => s.deficiencies !== "None").map(s => <li key={s.id} className="py-3"><Link to={`${recordPath}/checklist`}><b className="block">{s.name}</b><span className="text-xs text-muted-foreground">{s.id} · {s.year}</span><span className="block text-sm">{s.deficiencies}</span></Link></li>)}</ul></DialogContent></Dialog> },
    ]} />
    <div className="grid items-start gap-grid xl:grid-cols-[1fr_1.2fr]">
      <Panel title="Final grade distribution" description="2025–2026 2nd Semester · share of final grades across your advisees" action={<StaticSelect id="distribution-term" label="Term" value="2025–2026 2nd Semester" options={["2025–2026 2nd Semester", "2025–2026 1st Semester"]} />}>
        <GradeDistribution bands={adviserGradeBands} />
      </Panel>
      <DataTablePanel title="GWA by batch and curriculum version" description="Mean GWA of each batch, grouped by the curriculum version it follows." rows={adviserBatchGwas} rowKey={r => r.batch} columns={[
        { header: "Batch", cell: r => r.batch }, { header: "Curriculum", cell: r => r.curriculum }, { header: "Students", numeric: true, cell: r => r.students }, { header: "Mean GWA", numeric: true, cell: r => r.gwa }, { header: "", cell: () => <Link to="/adviser/advisees" className="font-semibold">View students</Link> },
      ]} />
    </div>
    <p className="mt-2 text-sm text-muted-foreground">Advising activity, standing, and milestone reports are added in releases 2 and 3.</p>
  </AdviserPage>
}
