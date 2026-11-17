import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createSaaisApiClient, type ApiSchema } from '@/lib/api'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'

const client = () => createSaaisApiClient({ baseUrl: 'https://saais-mock.supabase.co', apiKey: 'mock', mode: 'mock' })
const route = '/functions/v1/students/{student_id}/attempts/{attempt_id}/grades' as const
beforeAll(() => saaisMockServer.listen())
afterEach(() => { saaisMockServer.resetHandlers(); resetMockDatabase(); logoutMockPersona() })
afterAll(() => saaisMockServer.close())

describe('shared grade correction', () => {
  it('persists only the selected attempt and returns the updated revision and audit trail', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const student = db.profiles.find(p => p.email === 'sample.student01@vsu.edu.ph')!
    const other = db.profiles.find(p => p.email === 'sample.student03@vsu.edu.ph')!
    const attempt = db.attemptResults.find(a => a.student_id === student.id && a.course_offering_id === MOCK_IDS.offeringCsci101)!
    const otherAttempt = db.attemptResults.find(a => a.student_id === other.id && a.course_offering_id === MOCK_IDS.offeringCsci101)!
    const path = { student_id: student.id, attempt_id: attempt.id }
    const result = await client().PATCH(route, { params:{path}, body:{expected_revision:attempt.revision,final_grade:2.25,reason:'Corrected transcript'} })
    expect(result.response.status).toBe(200)
    expect(result.data).toMatchObject({ id:attempt.id, student_id:student.id, final_grade:2.25, effective_status:'passed', revision:2 })
    expect(db.attempts.find(a=>a.id===attempt.id)).toMatchObject({status:'passed',final_grade:2.25,revision:2})
    expect(db.attemptResults.find(a=>a.id===otherAttempt.id)?.final_grade).toBeNull()
    expect(db.auditLogEntries.at(-1)).toMatchObject({student_id:student.id,entity_id:attempt.id,reason:'Corrected transcript'})
    const grades = await client().GET('/functions/v1/students/{student_id}/grades', {params:{path:{student_id:student.id}}})
    expect(grades.data?.flatMap(t=>t.attempts).find(a=>a.id===attempt.id)?.final_grade).toBe(2.25)
    const summary = await client().GET('/functions/v1/students/{student_id}/academic-summary', {params:{path:{student_id:student.id}}})
    expect(summary.data?.gwa).toBe(2.25)
    expect((await client().PATCH(route,{params:{path},body:{expected_revision:1,final_grade:1.5,reason:'Stale'}})).response.status).toBe(409)
  })
  it('rejects wrong student, past adviser, locked terms, invalid values and completed INC', async () => {
    loginAsMockPersona('adviser')
    const db=getMockDatabase(); const student=db.profiles.find(p=>p.email==='sample.student01@vsu.edu.ph')!
    const other=db.profiles.find(p=>p.email==='sample.student03@vsu.edu.ph')!
    const attempt=db.attemptResults.find(a=>a.student_id===student.id)!
    const call=(studentId:string,attemptId:string,body:ApiSchema<'GradeCorrectionRequest'>)=>client().PATCH(route,{params:{path:{student_id:studentId,attempt_id:attemptId}},body})
    expect((await call(other.id,attempt.id,{expected_revision:1,final_grade:2,reason:'Reason'})).response.status).toBe(404)
    expect((await call(student.id,attempt.id,{expected_revision:1,final_grade:2.1,reason:'Reason'})).response.status).toBe(400)
    expect((await call(student.id,attempt.id,{expected_revision:1,final_grade:2,reason:'  '})).response.status).toBe(400)
    expect((await call(MOCK_IDS.studentPrimary,MOCK_IDS.attemptCsci102Inc,{expected_revision:1,final_grade:2,reason:'Reason'})).response.status).toBe(409)
    expect((await call(MOCK_IDS.studentPrimary,MOCK_IDS.attemptPhEd11IncResolved,{expected_revision:1,final_grade:2,reason:'Reason'})).response.status).toBe(409)
    db.adviserAssignments.find(a=>a.student_id===student.id)!.end_date='2026-01-01'
    expect((await call(student.id,attempt.id,{expected_revision:1,final_grade:2,reason:'Reason'})).response.status).toBe(403)
    expect(db.attemptResults.find(a=>a.id===attempt.id)?.final_grade).toBeNull()
  })
  it('enforces closure, DR pairing and strict prerequisites on the actual attempt', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const path = { student_id: MOCK_IDS.studentPrimary, attempt_id: MOCK_IDS.attemptCsci153Open }
    const patch = (body: ApiSchema<'GradeCorrectionRequest'>) => client().PATCH(route, { params: { path }, body })
    const closure = db.departmentTermEncodings.find(c => c.school_term_id === MOCK_IDS.term2026Sem1Open && c.department_id === MOCK_IDS.deptDcst)!
    closure.is_closed = true
    expect((await patch({ expected_revision: 1, final_grade: 2, reason: 'Reason' })).response.status).toBe(409)
    closure.is_closed = false
    const attempt = db.attemptResults.find(a => a.id === path.attempt_id)!
    attempt.prerequisite_override = false
    expect((await patch({ expected_revision: 1, final_grade: 2, reason: 'Reason' })).response.status).toBe(409)
    attempt.prerequisite_override = true
    expect((await patch({ expected_revision: 1, status: 'dr', reason: 'Reason' })).response.status).toBe(400)
    const dropped = await patch({ expected_revision: 1, midterm_status: 'dr', midterm_grade: null, reason: 'Dropped' })
    expect(dropped.data).toMatchObject({ recorded_status: 'dr', final_grade: null, revision: 2 })
    expect(db.attempts.find(a => a.id === path.attempt_id)?.status).toBe('dr')
  })
})
