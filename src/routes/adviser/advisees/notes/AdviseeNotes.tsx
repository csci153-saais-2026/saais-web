import { AdviserPage } from "../../Adviser"
import { notes } from "@/mocks/adviser.mock"
import { Panel } from "@/components/features/panel"
import { FormField } from "@/components/features/form-field"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { PlusIcon } from "@/components/icons"

export default function AdviseeNotes({ archived = false }: { archived?: boolean }) {
  return <AdviserPage title="Notes" tab="notes">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Note archive"><Button variant={archived ? "ghost" : "default"} size="sm" aria-pressed={!archived}>Active (3)</Button><Button variant={archived ? "default" : "ghost"} size="sm" aria-pressed={archived}>Archived (2)</Button></div>
      <Dialog><DialogTrigger asChild><Button><PlusIcon />Write a note</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Write a note</DialogTitle><DialogDescription>Visible to the student. Write what they and the next adviser should know.</DialogDescription></DialogHeader><FormField htmlFor="new-note" label="Note"><Textarea id="new-note" rows={6} value="" readOnly /></FormField><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button>Save note</Button></DialogFooter></DialogContent></Dialog>
    </div>
    <Panel title="Notes" description={`${archived ? "Archived" : "Active"} notes · visible to the student`} flush>
      {notes.filter(note => note.archived === archived).map(note => <article key={note.id} className="border-b border-line-soft px-5 py-5 last:border-0"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm"><b>{note.author}</b><span className="text-muted-foreground"> · {note.date}</span></p><Button variant="outline" size="sm">{archived ? "Restore" : "Archive"}</Button></div><p className="text-sm">{note.body}</p></article>)}
    </Panel>
  </AdviserPage>
}
