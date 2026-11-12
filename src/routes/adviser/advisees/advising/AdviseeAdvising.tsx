import { AdviserPage, StaticSelect } from "../../Adviser"
import { recommendations, notes } from "@/mocks/adviser.mock"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { Panel } from "@/components/features/panel"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NoteIcon, ChevronRightIcon } from "@/components/icons"

export default function AdviseeAdvising() {
  return <AdviserPage title="Advising" tab="advising">
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(270px,1fr)]">
      <div className="min-w-0">
        <DataTablePanel title="Course recommendations" description="2025 - 2026 · 2nd Semester" action={<StaticSelect id="plan-term" label="Term" value="2nd Semester" options={["1st Semester", "2nd Semester", "Summer / Midyear"]} />} rows={recommendations} rowKey={r => r.code} columns={[
          { header: "Select", cell: r => <Checkbox aria-label={`Select ${r.code}`} checked={false} /> },
          { header: "Course", cell: r => <><b className="block">{r.code}</b><span className="text-xs text-muted-foreground">{r.title}</span></> },
          { header: "Units", numeric: true, cell: r => r.units }, { header: "Why recommended", cell: r => r.reason },
        ]} footer={<><p>10 requirements or options excluded because of availability or prerequisites.</p><p className="mt-2">Failed requirements must be retaken. The student chooses the timing; dependent courses remain unavailable until their prerequisites pass.</p><div className="mt-4 flex items-center justify-between"><span>0 selected</span><Button disabled>Add selected to plan</Button></div></>} />
        <Panel title="Advising notes" description="Recent notes · visible to the student">
          {notes.slice(0, 2).map(note => <article key={note.id} className="mb-4 border-b border-line-soft pb-4"><div className="mb-2 flex justify-between gap-3 text-xs"><b>{note.author}</b><span className="text-muted-foreground">{note.date}</span></div><p className="text-sm">{note.body}</p></article>)}
          <FormField htmlFor="advising-note" label="Write an advising note"><Textarea id="advising-note" rows={4} placeholder="Write what the student and the next adviser should know…" value="" readOnly /></FormField>
          <div className="mt-3 flex justify-end gap-2"><Button variant="outline">Cancel</Button><Button><NoteIcon />Save note</Button></div>
        </Panel>
      </div>
      <Panel title="Advising assistant" description="About Maria Isabel Bautista · Demo preview">
        <div className="space-y-4 text-sm">
          <p className="ml-6 rounded-md bg-primary p-3 text-primary-foreground">What should Maria take next term?</p>
          <p className="rounded-md bg-secondary p-3">Demo preview: eligible offered courses for 2nd Semester: Envi 11, CSci 126, CSci 154, CSci 183, Humn 11, ScSc 16. This uses the selected record, prerequisite results and curriculum horizon. Verify before recording enrollment; this chat does not save academic changes.</p>
          <p className="ml-6 rounded-md bg-primary p-3 text-primary-foreground">Good. Flag anything hidden because of a prerequisite.</p>
          <p className="rounded-md bg-secondary p-3">Noted below the list — it names the course and which prerequisite is still outstanding.</p>
          <Alert variant="advisory"><AlertDescription>Drafts suggestions from this record. Always verify before acting.</AlertDescription></Alert>
          <div className="flex gap-2"><Input aria-label="Message the advising assistant" placeholder="Ask about this record…" value="" readOnly /><Button size="icon" aria-label="Send message" disabled><ChevronRightIcon /></Button></div>
        </div>
      </Panel>
    </div>
  </AdviserPage>
}
