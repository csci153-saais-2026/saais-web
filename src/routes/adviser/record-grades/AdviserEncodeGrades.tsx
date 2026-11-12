import { Link } from "react-router"
import { AdviserPage, StaticSelect } from "../Adviser"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { Button } from "@/components/ui/button"
import { UploadIcon, PlusIcon } from "@/components/icons"

export default function AdviserEncodeGrades() {
  return <AdviserPage title="Encode grades">
    <PageHeading title="Encode grades" subtitle="One advisee, one term, all courses" actions={<Button asChild variant="outline"><Link to="/adviser/import-grades"><UploadIcon />Import a JSON file instead</Link></Button>} />
    <div className="grid items-start gap-grid lg:grid-cols-2">
      <Panel title="Advisee and term" description="Grades are saved against this advisee for the chosen term."><div className="grid gap-4"><StaticSelect id="grade-advisee" label="Advisee" value="Ana Reyes · 23-1-01234" options={["Ana Reyes · 23-1-01234", "Ben Lopez · 23-1-01301", "Dino Castillo · 24-1-02011", "Maria Isabel Bautista · 2023-04412"]} /><StaticSelect id="grade-term" label="Term" value="2026–2027 · 1st Semester" options={["2026–2027 · 1st Semester", "2025–2026 · 2nd Semester"]} /></div></Panel>
      <Panel title="INC resolution" description="Pending incomplete grades for the advisee chosen in the card on the left."><p className="text-sm text-muted-foreground">No pending incomplete grades for this sample advisee.</p></Panel>
    </div>
    <DataTablePanel title="Courses" description="Midterm and final grades use the VSU scale: 1.00 to 3.00 passes, 5.00 fails, INC and DR are special marks." rows={[] as string[]} rowKey={r => r} empty="No courses added." columns={["Course", "Instructor", "Midterm", "Final", "Remarks", "Remove row"].map(header => ({ header, cell: () => "—" }))} footer={<Button variant="outline" size="sm"><PlusIcon />Add course</Button>} />
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><p className="text-sm text-muted-foreground">Try setting a final grade to DR without a DR midterm, or a midterm to DR: SAAIS enforces the VSU grade rules as you type.</p><Button>Save grades</Button></div>
  </AdviserPage>
}
