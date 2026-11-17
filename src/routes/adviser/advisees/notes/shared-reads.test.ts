import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { saaisMockServer } from '@/mocks/node'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, resetMockDatabase } from '@/mocks'
import { getNotes, setNoteArchived } from './notes.api'
import { getCurriculumData } from '../curriculum/curriculum.api'
import { getStudentHistory } from '../history/history.api'
vi.mock('@/lib/api', async importOriginal => { const api=await importOriginal<typeof import('@/lib/api')>();return {...api,apiClient:api.createSaaisApiClient({baseUrl:'https://saais-mock.supabase.co',apiKey:'mock',mode:'mock',fetch:(...args)=>globalThis.fetch(...args)})} })
beforeAll(()=>saaisMockServer.listen());afterEach(()=>{saaisMockServer.resetHandlers();resetMockDatabase();logoutMockPersona()});afterAll(()=>saaisMockServer.close())
describe('shared selected-student reads',()=>{
 it('keeps notes, curriculum and access scoped to the selected student',async()=>{
  loginAsMockPersona('adviser');const db=getMockDatabase();const one=db.profiles.find(p=>p.email==='sample.student01@vsu.edu.ph')!;const two=db.profiles.find(p=>p.email==='sample.student03@vsu.edu.ph')!
  const [first,second,curriculum]=await Promise.all([getNotes(one.id),getNotes(two.id),getCurriculumData(two.id)])
  expect(first.notes.every(n=>n.student_id===one.id)).toBe(true);expect(second.notes.every(n=>n.student_id===two.id)).toBe(true);expect(curriculum.assignments.every(a=>a.student_id===two.id)).toBe(true)
  const archived=first.notes.find(n=>n.is_archived)!;await setNoteArchived(one.id,archived.id,false);expect((await getNotes(one.id)).notes.find(n=>n.id===archived.id)?.is_archived).toBe(false)
  loginAsMockPersona('adviser_secondary');await expect(getCurriculumData(one.id)).rejects.toThrow();await expect(getStudentHistory(one.id)).rejects.toThrow()
 })
 it('refuses archive actions from a former adviser',async()=>{
  loginAsMockPersona('adviser');const db=getMockDatabase();const student=db.profiles.find(p=>p.email==='sample.student01@vsu.edu.ph')!;const note=db.advisingNotes.find(n=>n.student_id===student.id)!;db.adviserAssignments.find(a=>a.student_id===student.id)!.end_date='2026-10-01'
  expect((await getNotes(student.id)).isCurrent).toBe(false);await expect(setNoteArchived(student.id,note.id,false)).rejects.toThrow()
 })
})
