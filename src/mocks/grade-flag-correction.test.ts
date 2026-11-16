import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createSaaisApiClient } from '@/lib/api'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'

const client = () => createSaaisApiClient({ baseUrl: 'https://saais-mock.supabase.co', apiKey: 'mock', mode: 'mock' })
beforeAll(() => saaisMockServer.listen())
afterEach(() => { saaisMockServer.resetHandlers(); resetMockDatabase(); logoutMockPersona() })
afterAll(() => saaisMockServer.close())

describe('flag midterm corrections', () => {
  it('pairs dropped statuses, rejects a numeric dropped grade, and restores enrollment for a numeric correction', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const flag = db.gradeFlags.find(f => f.id === MOCK_IDS.gradeFlag1)!
    const attempt = db.attemptResults.find(a => a.id === flag.attempt_id)!
    const path = { flag_id: flag.id }
    const base = { resolution_action: 'correct' as const, resolution_note: 'Correct record', expected_revision: attempt.revision }
    const invalid = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', { params: { path }, body: { ...base, corrected_midterm_status: 'dr', corrected_grade: 2 } })
    expect(invalid.response.status).toBe(400)
    expect(db.gradeFlags.find(f => f.id === flag.id)?.status).toBe('open')
    const dropped = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', { params: { path }, body: { ...base, corrected_midterm_status: 'dr' } })
    expect(dropped.response.status).toBe(200)
    expect(db.attemptResults.find(a => a.id === attempt.id)).toMatchObject({ midterm_status: 'dr', midterm_grade: null, recorded_status: 'dr', effective_status: 'dr', final_grade: null })
    db.gradeFlags[db.gradeFlags.findIndex(f => f.id === flag.id)] = { ...flag, status: 'open' }
    const graded = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', { params: { path }, body: { ...base, expected_revision: attempt.revision + 1, corrected_grade: 2.25 } })
    expect(graded.response.status).toBe(200)
    expect(db.attemptResults.find(a => a.id === attempt.id)).toMatchObject({ midterm_status: 'graded', midterm_grade: 2.25, recorded_status: 'currently_enrolled', effective_status: 'currently_enrolled', final_grade: null })
  })
})
