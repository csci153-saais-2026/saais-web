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

  it('validates final grades against their derived status and initializes INC deadlines', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const flagIndex = db.gradeFlags.findIndex(f => f.id === MOCK_IDS.gradeFlag1)
    const sourceFlag = db.gradeFlags[flagIndex]!
    const attemptIndex = db.attemptResults.findIndex(a => a.id === sourceFlag.attempt_id)
    const originalAttempt = structuredClone(db.attemptResults[attemptIndex]!)
    const flag = { ...sourceFlag, reported_stage: 'final' as const, status: 'open' as const }
    db.gradeFlags[flagIndex] = flag
    const path = { flag_id: flag.id }
    const base = { resolution_action: 'correct' as const, resolution_note: 'Correct final record', expected_revision: originalAttempt.revision }

    const invalidGrade = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', { params: { path }, body: { ...base, corrected_grade: 99 } })
    expect(invalidGrade.response.status).toBe(400)
    expect(db.attemptResults[attemptIndex]).toEqual(originalAttempt)
    expect(db.gradeFlags[flagIndex]?.status).toBe('open')

    const contradictory = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', { params: { path }, body: { ...base, corrected_grade: 1.5, corrected_status: 'failed' } })
    expect(contradictory.response.status).toBe(400)
    expect(db.attemptResults[attemptIndex]).toEqual(originalAttempt)
    expect(db.gradeFlags[flagIndex]?.status).toBe('open')

    const inc = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', { params: { path }, body: { ...base, corrected_status: 'inc' } })
    expect(inc.response.status).toBe(200)
    expect(db.attemptResults[attemptIndex]).toMatchObject({ recorded_status: 'inc', effective_status: 'inc', final_grade: null, gwa_grade: null, inc_deadline: db.schoolTerms.find(term => term.id === db.courseOfferings.find(offering => offering.id === originalAttempt.course_offering_id)?.school_term_id)?.default_inc_deadline })
    expect(db.gradeFlags[flagIndex]?.status).toBe('corrected')
  })

  it('rejects changing a completed INC back to INC through flag resolution', async () => {
    loginAsMockPersona('adviser')
    const db = getMockDatabase()
    const flagIndex = db.gradeFlags.findIndex(flag => flag.id === MOCK_IDS.gradeFlag1)
    const flag = { ...db.gradeFlags[flagIndex]!, attempt_id: MOCK_IDS.attemptPhEd11IncResolved, reported_stage: 'final' as const, status: 'open' as const }
    db.gradeFlags[flagIndex] = flag
    const attemptIndex = db.attemptResults.findIndex(attempt => attempt.id === flag.attempt_id)
    const originalAttempt = structuredClone(db.attemptResults[attemptIndex]!)
    const originalResolution = structuredClone(db.incResolutions.find(resolution => resolution.attempt_id === flag.attempt_id))

    const response = await client().POST('/functions/v1/grade-flags/{flag_id}/resolve', {
      params: { path: { flag_id: flag.id } },
      body: { resolution_action: 'correct', corrected_status: 'inc', resolution_note: 'Preserve completion', expected_revision: originalAttempt.revision },
    })

    expect(response.response.status).toBe(409)
    expect(db.attemptResults[attemptIndex]).toEqual(originalAttempt)
    expect(db.incResolutions.find(resolution => resolution.attempt_id === flag.attempt_id)).toEqual(originalResolution)
    expect(db.gradeFlags[flagIndex]?.status).toBe('open')
  })
})
