import { AdviserPage } from "../../Adviser"
import { history } from "@/mocks/adviser.mock"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { Button } from "@/components/ui/button"

export default function AdviseeHistory() {
  return <AdviserPage title="Audit log" tab="history">
    <DataTablePanel title="Audit log" description="Actions taken by Maria Isabel Bautista and by you on this advisee’s record. Entries cannot be edited." action={<div className="flex flex-wrap gap-1" role="group" aria-label="Audit actor"><Button size="sm" aria-pressed>All actions</Button><Button size="sm" variant="ghost" aria-pressed={false}>Advisee actions</Button><Button size="sm" variant="ghost" aria-pressed={false}>Adviser actions</Button></div>} rows={history.filter(r => r.action)} rowKey={r => `${r.date}-${r.action}`} columns={[
      { header: "Date and time", cell: r => <span className="font-mono text-xs">{r.date}</span> }, { header: "Actor", cell: r => r.actor }, { header: "Action", cell: r => <b>{r.action}</b> }, { header: "Details", cell: r => r.details },
    ]} footer="12 entries" />
  </AdviserPage>
}
