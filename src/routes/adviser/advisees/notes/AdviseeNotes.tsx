import { useState } from 'react'
import { useParams } from 'react-router'
import { AdviserPage } from '../../Adviser'
import { useAuth } from '@/hooks/use-auth'
import { useScopedRequest } from '../use-scoped-request'
import { addNote, getNotes, setNoteArchived } from './notes.api'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function NotesContent({ id, userId, isAdmin }: { id: string; userId: string; isAdmin: boolean }) {
  const [archived, setArchived] = useState(false)
  const [revision, setRevision] = useState(0)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [message, setMessage] = useState('')
  const [writing, setWriting] = useState(false)
  const { data, error } = useScopedRequest(JSON.stringify([userId, id, revision]), true, () => getNotes(id))
  const canEdit = !!data && (data.isCurrent || isAdmin)
  const notes = data?.notes.filter(note => note.is_archived === archived) ?? []
  async function save() {
    if (!text.trim()) return
    setSaving(true); setMutationError(''); setMessage('')
    try { await addNote(id, text.trim()); setText(''); setWriting(false); setMessage('Note added.'); setRevision(n => n + 1) }
    catch (e) { setMutationError(e instanceof Error ? e.message : 'Unable to add note.') }
    finally { setSaving(false) }
  }
  async function toggle(noteId: string, next: boolean) {
    setSaving(true); setMutationError(''); setMessage('')
    try { await setNoteArchived(id, noteId, next); setMessage(next ? 'Note archived.' : 'Note restored.'); setRevision(n => n + 1) }
    catch (e) { setMutationError(e instanceof Error ? e.message : 'Unable to update note.') }
    finally { setSaving(false) }
  }
  return <>
    {!data && !error && <p role="status">Loading notes…</p>}
    {error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setRevision(n => n + 1)}>Try again</Button></div>}
    {message && <p role="status">{message}</p>}{mutationError && <p role="alert">{mutationError}</p>}
    {data && <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Note archive"><Button variant={!archived ? 'default' : 'ghost'} size="sm" aria-pressed={!archived} onClick={() => setArchived(false)}>Active ({data.notes.filter(n => !n.is_archived).length})</Button><Button variant={archived ? 'default' : 'ghost'} size="sm" aria-pressed={archived} onClick={() => setArchived(true)}>Archived ({data.notes.filter(n => n.is_archived).length})</Button></div>{canEdit && <Button onClick={() => setWriting(true)}>Write a note</Button>}</div>
      {!canEdit && <p className="mb-4">Historical record: read-only.</p>}
      <Panel title="Notes" description={`${archived ? 'Archived' : 'Active'} notes · visible to the student`} flush>
        {!notes.length && <p className="px-5 py-5">No {archived ? 'archived' : 'active'} notes.</p>}
        {notes.map(note => <article key={note.id} className="border-b border-line-soft px-5 py-5 last:border-0"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm"><b>{note.author_name ?? 'Adviser'}</b><span className="text-muted-foreground"> · {new Date(note.created_at).toLocaleDateString()}</span></p>{canEdit && <Button variant="outline" size="sm" disabled={saving} onClick={() => void toggle(note.id, !note.is_archived)}>{note.is_archived ? 'Restore' : 'Archive'}</Button>}</div><p className="whitespace-pre-wrap text-sm">{note.body_text}</p></article>)}
      </Panel>
      {canEdit && <Dialog open={writing} onOpenChange={open => { if (!saving) setWriting(open) }}><DialogContent><DialogHeader><DialogTitle>Write a note</DialogTitle><DialogDescription>Visible to the student and their advisers.</DialogDescription></DialogHeader><label htmlFor="new-note" className="text-sm font-medium">Advising note</label><Textarea disabled={saving} id="new-note" rows={4} maxLength={5000} placeholder="Write what the student and the next adviser should know." value={text} onChange={e => setText(e.target.value)} /><div className="flex justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={() => { setWriting(false); setText('') }}>Cancel</Button><Button disabled={saving || !text.trim()} onClick={() => void save()}>{saving ? 'Saving…' : 'Save note'}</Button></div></DialogContent></Dialog>}
    </>}
  </>
}
export default function AdviseeNotes() {
  const { id } = useParams<{ id: string }>()
  const { user, roles } = useAuth()
  return <AdviserPage title="Notes" tab="notes" sample={false}>{id && user && <NotesContent key={`${user.id}:${id}`} id={id} userId={user.id} isAdmin={roles.includes('admin')} />}</AdviserPage>
}
