import { Link } from "react-router"
import { AdviserPage, StaticSelect, recordPath } from "../Adviser"
import { advisees } from "@/mocks/adviser.mock"
import { PageHeading } from "@/components/features/page-heading"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { FormField } from "@/components/features/form-field"
import { SearchInput } from "@/components/features/search-input"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"

export default function AdviseesPage() {
  return <AdviserPage title="Advisees">
    <PageHeading title="Know your students." subtitle="Search current and past advisees. Historical records remain read-only." />
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
      <FormField label="Search advisees" htmlFor="advisee-search" className="flex-1"><SearchInput id="advisee-search" placeholder="Name or student number" value="" readOnly /></FormField>
      <StaticSelect id="standing" label="Standing" value="All standings" options={["All standings", "Delinquency flags", "Good standing"]} className="md:w-56" />
      <div className="flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Advisee assignment"><Button size="sm" aria-pressed>Current</Button><Button size="sm" variant="ghost" aria-pressed={false}>Past</Button></div>
    </div>
    <DataTablePanel title="Advisees" description="5 matching sample records" rows={advisees} rowKey={r => r.id} columns={[
      { header: "Student", cell: r => <><Link to={`${recordPath}/checklist`} className="font-semibold">{r.name}</Link><span className="block font-mono text-xs text-muted-foreground">{r.id} · {r.year}</span></> },
      { header: "Program", cell: r => <>BS Computer Science<span className="block text-xs text-muted-foreground">Curriculum {r.curriculum}</span></> },
      { header: "Year standing", cell: r => r.year }, { header: "GWA", numeric: true, cell: r => r.gwa }, { header: "Open flags", numeric: true, cell: r => r.flags }, { header: "Standing", cell: r => <StatusBadge status={r.standing} /> }, { header: "Deficiencies", cell: r => r.deficiencies },
    ]} footer="Past advisees are read-only. Their records stay with their current adviser." />
  </AdviserPage>
}
