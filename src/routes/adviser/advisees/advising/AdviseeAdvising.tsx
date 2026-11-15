import { AdviserPage, StaticSelect } from "../../Adviser"
import { recommendations, notes } from "@/mocks/adviser.mock"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { Panel } from "@/components/features/panel"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { NoteIcon } from "@/components/icons"
import { useParams } from "react-router"
import { useAuth } from "@/hooks/use-auth"
import { AdvisingAssistant } from "./AdvisingAssistant"

export default function AdviseeAdvising() {
  const { id } = useParams<{ id: string }>()
  const { user, isMockMode } = useAuth()
  const sharedRecord = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  if (sharedRecord) return <AdviserPage title="Advising" tab="advising" sample={false}>
    <p>Advising recommendations and notes are not yet connected to this student record.</p>
    <AdvisingAssistant key={`${user?.id ?? ""}:${id}`} studentId={id} isMockMode={isMockMode} />
  </AdviserPage>
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
      <AdvisingAssistant key={`${user?.id ?? ""}:${id ?? ""}`} studentId={id} isMockMode={isMockMode} />
    </div>
  </AdviserPage>
}
