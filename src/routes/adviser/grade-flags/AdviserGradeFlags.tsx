import { gradeFlags } from "@/mocks/adviser.mock"
import { AdviserPage, StaticSelect } from "../Adviser"
import { PageHeading } from "@/components/features/page-heading"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"


export default function AdviserGradeFlags() {
  return <AdviserPage title="Grade flags"><PageHeading title="Grade flags" subtitle="Grades your advisees reported as wrong" />
    <DataTablePanel title="Open flags" description="1 open" rows={gradeFlags} rowKey={r => r.id} columns={[
      { header: "Student", cell: r => <><b className="block">{r.student}</b><span className="font-mono text-xs text-muted-foreground">{r.number}</span></> }, { header: "Course", cell: r => r.course }, { header: "Grade", cell: r => <span className="font-mono">{r.grade}</span> }, { header: "Comment", cell: r => r.comment }, { header: "Raised", cell: r => r.raised },
      { header: "Action", cell: () => <div className="flex gap-2">{[false, true].map(reject => <Dialog key={String(reject)}><DialogTrigger asChild><Button size="sm" variant="outline">{reject ? "Reject" : "Fix grade"}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{reject ? "Reject flag" : "Fix grade"}</DialogTitle><DialogDescription>Ana Reyes · CSci 33 · midterm grade 2.25</DialogDescription></DialogHeader>{!reject && <StaticSelect id="corrected-grade" label="Corrected grade" value="Choose the corrected grade" options={["Choose the corrected grade", "1.00", "1.25", "1.50", "1.75", "2.00", "2.25", "2.50", "2.75", "3.00", "5.00", "INC", "DR"]} />}<FormField htmlFor={reject ? "flag-reply" : "flag-reason"} label={reject ? "Reply to the student" : "Reason for change"}><Textarea id={reject ? "flag-reply" : "flag-reason"} value="" readOnly /></FormField><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button>{reject ? "Reject flag" : "Save correction"}</Button></DialogFooter></DialogContent></Dialog>)}</div> },
    ]} />
  </AdviserPage>
}
