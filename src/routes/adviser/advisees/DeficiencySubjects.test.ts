import { expect, it, vi } from 'vitest'
import { getDeficiencySubjects } from './deficiency-subjects.api'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({
  apiClient: { GET: get },
  postgrestFilter: {
    eq: (value: string) => `eq.${value}`,
    inList: (ids: string[]) => `in.(${ids.join(',')})`,
  },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}))

it('uses the selected student’s grade history when the summary omits subjects', async () => {
  get.mockImplementation(async (path: string) => {
    if (path.endsWith('/academic-summary')) return { data: {} }
    if (path.endsWith('/grades')) return { data: [{ attempts: [{ course_offering_id: 'offering-one', recorded_status: 'inc', completion_grade: null, is_repeated: false }, { course_offering_id: 'offering-two', effective_status: 'failed', is_repeated: true }] }] }
    if (path === '/rest/v1/grade_flag') return { data: [] }
    if (path === '/rest/v1/course_offering') return { data: [{ id: 'offering-one', course_id: 'course-one' }] }
    if (path === '/rest/v1/course') return { data: [{ id: 'course-one', code: 'CS 101' }] }
    throw new Error(`Unexpected endpoint: ${path}`)
  })
  expect(await getDeficiencySubjects('student-one')).toEqual(['CS 101'])
  expect(get).toHaveBeenCalledWith('/functions/v1/students/{student_id}/grades', expect.objectContaining({ params: expect.objectContaining({ path: { student_id: 'student-one' } }) }))
})
