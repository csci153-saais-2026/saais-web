import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { listAcademicTerms } from './academic-terms.api'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: actual.createSaaisApiClient({
      baseUrl: 'http://localhost:3000',
      mode: 'mock',
      getAccessToken: async () => 'mock-academic-terms-test',
      fetch: (...args) => globalThis.fetch(...args),
    }),
  }
})

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Academic term reads', () => {
  it('reads the institutional calendar and only the active department encoding records', async () => {
    const term = {
      id: 'term-1',
      start_year: 2025,
      end_year: 2026,
      term_type: '2nd Semester',
      school_year: '2025 - 2026',
      is_locked: true,
      override_flag: false,
      starts_on: '2026-01-15',
      ends_on: '2026-05-30',
      encoding_deadline: '2026-06-15',
      closed_by_name: 'Institution Admin',
      closed_at: '2026-06-16T00:00:00Z',
      default_inc_deadline: '2027-05-30',
      chronological_key: 20252,
    }
    const departmentClosure = {
      id: 'closure-1',
      school_term_id: 'term-1',
      department_id: 'department-1',
      is_closed: false,
      closed_by_name: null,
      closed_at: null,
    }

    server.use(
      http.get('*/rest/v1/school_term', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('select')).toContain('is_locked')
        expect(query.get('select')).toContain('closed_by_name')
        expect(query.get('order')).toBe('chronological_key.desc,id.asc')
        expect(query.get('limit')).toBe('1000')
        return HttpResponse.json([term])
      }),
      http.get('*/rest/v1/department_term_encoding', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('department_id')).toBe('eq.department-1')
        expect(query.get('select')).toContain('department_id')
        expect(query.get('select')).toContain('closed_at')
        return HttpResponse.json([
          departmentClosure,
          { ...departmentClosure, id: 'foreign-closure', department_id: 'department-2' },
        ])
      }),
    )

    await expect(listAcademicTerms('department-1')).resolves.toEqual({
      terms: [term],
      departmentClosures: [departmentClosure],
    })
  })

  it('does not present a partial term history as complete', async () => {
    server.use(
      http.get('*/rest/v1/school_term', () =>
        HttpResponse.json([], {
          status: 206,
          headers: { 'Content-Range': '0-9/20' },
        }),
      ),
      http.get('*/rest/v1/department_term_encoding', () =>
        HttpResponse.json([]),
      ),
    )

    await expect(listAcademicTerms('department-1')).rejects.toThrow(
      'A complete term history could not be loaded.',
    )
  })

  it('preserves a denied department-closure read as an error', async () => {
    server.use(
      http.get('*/rest/v1/school_term', () => HttpResponse.json([])),
      http.get('*/rest/v1/department_term_encoding', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    )

    await expect(listAcademicTerms('department-1')).rejects.toMatchObject({
      isForbidden: true,
    })
  })
})
