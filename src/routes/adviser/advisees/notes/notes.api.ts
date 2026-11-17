import { apiClient, postgrestFilter, unwrapApiResult } from '@/lib/api'
import type { ApiSchema } from '@/lib/api'
import { getRoster } from '../advisees.api'

export async function getNotes(studentId: string) {
  const notes: ApiSchema<'AdvisingNote'>[] = []
  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(await apiClient.GET('/rest/v1/advising_note', { params: { query: {
      student_id: postgrestFilter.eq(studentId), select: 'id,student_id,authored_by,author_name,author_role_label,body_text,is_archived,archived_at,archived_by,created_at', order: 'created_at.desc,id.desc', limit: 100, offset,
    } } }))
    if (page.some(note => note.student_id !== studentId || notes.some(existing => existing.id === note.id))) throw new Error('The note response did not match the selected student.')
    notes.push(...page)
    if (page.length < 100) break
  }
  const current = await getRoster('current')
  return { notes, isCurrent: current.some(row => row.student_id === studentId) }
}
export async function addNote(studentId: string, text: string) {
  return unwrapApiResult(await apiClient.POST('/functions/v1/students/{student_id}/notes', { params: { path: { student_id: studentId } }, body: { body_text: text } }))
}
export async function setNoteArchived(studentId: string, noteId: string, archived: boolean) {
  return unwrapApiResult(await apiClient.PATCH('/functions/v1/students/{student_id}/notes/{note_id}', { params: { path: { student_id: studentId, note_id: noteId } }, body: { is_archived: archived } }))
}
