import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api'
import { getDeficiencySubjects } from './deficiency-subjects.api'

describe('getDeficiencySubjects', () => {
  it('includes a course that is referenced only by an open grade flag', async () => {
    const response = new Response(null, { status: 200 })
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({ data: { deficiencies: undefined }, error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ school_term_id: 'term-1', attempts: [{ id: 'attempt-flagged', course_offering_id: 'offering-1', is_repeated: false, effective_status: 'passed', recorded_status: 'passed', completion_grade: null }] }], error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ attempt_id: 'attempt-flagged' }], error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ id: 'offering-1', course_id: 'course-1' }], error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ id: 'course-1', code: 'CSCI 101' }], error: undefined, response } as never)

    await expect(getDeficiencySubjects('student-1')).resolves.toEqual(['CSCI 101'])
  })
})
