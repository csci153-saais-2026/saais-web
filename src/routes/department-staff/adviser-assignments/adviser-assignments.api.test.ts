import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  listStudentAdviserAssignments,
} from './adviser-assignments.api'
import { listStudentFilterOptions } from '../students/students.api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: 'http://localhost:3000',
      mode: 'mock',
      getAccessToken: async () => 'mock-adviser-assignment-test',
      fetch: (...args) => globalThis.fetch(...args),
    }),
  }
})

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Adviser assignment preparation reads', () => {
  it('loads history for only the requested roster students', async () => {
    const requestedId = '33333333-3333-4333-8333-333333333333'
    const foreignId = '99999999-9999-4999-8999-999999999999'
    const activeAssignment = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      adviser_id: '88888888-8888-4888-8888-888888888888',
      adviser_name: 'Current Adviser',
      adviser_email: null,
      adviser_faculty_name: null,
      adviser_consultation_hours: null,
      student_id: requestedId,
      start_date: '2026-04-01',
      end_date: null,
      handed_over_to_adviser_id: null,
      handed_over_to_name: null,
      handover_label: null,
      created_at: '2026-04-01T00:00:00Z',
    }

    server.use(
      http.get('*/rest/v1/adviser_assignment', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('student_id')).toContain(requestedId)
        expect(query.get('select')).toContain('adviser_name')
        expect(query.get('select')).toContain('start_date')
        expect(query.has('department_id')).toBe(false)
        expect(query.get('order')).toBe('student_id.asc,start_date.asc,id.asc')
        return HttpResponse.json([
          activeAssignment,
          {
            ...activeAssignment,
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            student_id: foreignId,
          },
        ])
      }),
    )

    await expect(listStudentAdviserAssignments([requestedId])).resolves.toEqual([
      activeAssignment,
    ])
  })

  it('rejects partial adviser history instead of preparing from incomplete data', async () => {
    server.use(
      http.get('*/rest/v1/adviser_assignment', () =>
        HttpResponse.json([], {
          status: 206,
          headers: { 'Content-Range': '0-9/20' },
        }),
      ),
    )

    await expect(
      listStudentAdviserAssignments([
        '33333333-3333-4333-8333-333333333333',
      ]),
    ).rejects.toThrow('Adviser assignment history is incomplete')
  })

  it('rejects malformed assignment dates before exposing history to selection', async () => {
    server.use(
      http.get('*/rest/v1/adviser_assignment', () =>
        HttpResponse.json([
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            adviser_id: '88888888-8888-4888-8888-888888888888',
            adviser_name: 'Current Adviser',
            student_id: '33333333-3333-4333-8333-333333333333',
            start_date: 'not-a-calendar-date',
            end_date: null,
            created_at: '2026-04-01T00:00:00Z',
          },
        ]),
      ),
    )

    await expect(
      listStudentAdviserAssignments([
        '33333333-3333-4333-8333-333333333333',
      ]),
    ).rejects.toThrow('returned invalid or incomplete history')
  })

  it('offers only active profiles with an adviser role in the current department', async () => {
    const departmentId = '22222222-2222-4222-8222-222222222222'
    const eligibleId = '88888888-8888-4888-8888-888888888888'
    const inactiveId = '77777777-7777-4777-8777-777777777777'
    const otherDepartmentId = '66666666-6666-4666-8666-666666666666'

    server.use(
      http.get('*/rest/v1/program', () => HttpResponse.json([])),
      http.get('*/rest/v1/role_assignment', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('role')).toBe('eq.adviser')
        expect(query.get('department_id')).toBe(`eq.${departmentId}`)
        return HttpResponse.json([
          {
            id: 'role-eligible',
            profile_id: eligibleId,
            role: 'adviser',
            department_id: departmentId,
          },
          {
            id: 'role-inactive',
            profile_id: inactiveId,
            role: 'adviser',
            department_id: departmentId,
          },
          {
            id: 'role-foreign',
            profile_id: otherDepartmentId,
            role: 'adviser',
            department_id: 'another-department',
          },
          {
            id: 'role-not-adviser',
            profile_id: '55555555-5555-4555-8555-555555555555',
            role: 'department_staff',
            department_id: departmentId,
          },
        ])
      }),
      http.get('*/rest/v1/profile', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('status')).toBe('eq.active')
        return HttpResponse.json([
          { id: eligibleId, full_name: 'Active Adviser', status: 'active' },
          { id: inactiveId, full_name: 'Inactive Adviser', status: 'inactive' },
        ])
      }),
    )

    await expect(listStudentFilterOptions(departmentId)).resolves.toEqual({
      curricula: [],
      advisers: [{ id: eligibleId, label: 'Active Adviser' }],
    })
  })
})
