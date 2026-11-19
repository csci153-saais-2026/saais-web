import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, postgrestFilter } from '@/lib/api'
import { getDeficiencySubjects } from './deficiency-subjects.api'

afterEach(() => vi.restoreAllMocks())

describe('getDeficiencySubjects', () => {
  it('returns active failed, unresolved INC, and dropped courses without counting passed or repeated attempts', async () => {
    const response = new Response(null, { status: 200 })
    const get = vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({ data: { deficiencies: undefined }, error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ school_term_id: 'term-1', attempts: [
        { course_offering_id: 'failed', effective_status: 'failed', is_repeated: false },
        { course_offering_id: 'inc', recorded_status: 'inc', completion_grade: null, is_repeated: false },
        { course_offering_id: 'dropped', effective_status: 'dr', is_repeated: false },
        { course_offering_id: 'passed', recorded_status: 'passed', effective_status: 'passed', is_repeated: false },
        { course_offering_id: 'completed-inc', recorded_status: 'inc', completion_grade: 2, effective_status: 'passed', is_repeated: false },
        { course_offering_id: 'repeated', effective_status: 'failed', is_repeated: true },
      ] }], error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ id: 'failed', course_id: '1' }, { id: 'inc', course_id: '2' }, { id: 'dropped', course_id: '3' }], error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ id: '1', code: 'CS 101' }, { id: '2', code: 'CS 102' }, { id: '3', code: 'CS 103' }], error: undefined, response } as never)

    await expect(getDeficiencySubjects('student-1')).resolves.toEqual(['CS 101', 'CS 102', 'CS 103'])
    expect(get).toHaveBeenCalledWith('/rest/v1/course_offering', expect.objectContaining({ params: { query: { id: postgrestFilter.inList(['failed', 'inc', 'dropped']), limit: 100 } } }))
    expect(get.mock.calls.some(([path]) => path === '/rest/v1/grade_flag')).toBe(false)
  })

  it('does not list a passed course as a deficiency just because it may have an open grade flag', async () => {
    const response = new Response(null, { status: 200 })
    const get = vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({ data: { deficiencies: undefined }, error: undefined, response } as never)
      .mockResolvedValueOnce({ data: [{ attempts: [{ course_offering_id: 'passed', effective_status: 'passed', is_repeated: false }] }], error: undefined, response } as never)

    await expect(getDeficiencySubjects('student-1')).resolves.toEqual([])
    expect(get.mock.calls.some(([path]) => path === '/rest/v1/grade_flag')).toBe(false)
  })
})
