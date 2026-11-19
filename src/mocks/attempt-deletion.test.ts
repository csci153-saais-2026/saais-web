import { afterAll, afterEach, beforeAll, expect, it } from 'vitest'
import { createSaaisApiClient } from '@/lib/api'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'

beforeAll(() => saaisMockServer.listen())
afterEach(() => { saaisMockServer.resetHandlers(); resetMockDatabase(); logoutMockPersona() })
afterAll(() => saaisMockServer.close())

it('does not report success when a saved course remains in the mock database', async () => {
  loginAsMockPersona('adviser')
  const db = getMockDatabase()
  const attempt = db.attemptResults.find(item => item.student_id === MOCK_IDS.studentPrimary && item.id === MOCK_IDS.attemptCsci153Open)!
  const client = createSaaisApiClient({ baseUrl: 'https://saais-mock.supabase.co', apiKey: 'mock', mode: 'mock' })
  const result = await client.DELETE('/functions/v1/students/{student_id}/attempts/{attempt_id}', {
    params: { path: { student_id: attempt.student_id, attempt_id: attempt.id } },
  })
  expect(result.response.status).toBe(409)
  expect(result.error).toMatchObject({ message: 'Saved course attempts cannot be deleted.' })
  expect(db.attemptResults.some(item => item.id === attempt.id)).toBe(true)
})
