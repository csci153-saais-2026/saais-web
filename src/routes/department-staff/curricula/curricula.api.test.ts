import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createCurriculumVersion, listCurricula, readCurriculum } from './curricula.api'

vi.mock('@/lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, apiClient: actual.createSaaisApiClient({
    baseUrl: 'http://localhost:3000', mode: 'mock',
    getAccessToken: async () => 'mock-curriculum-test',
    fetch: (...args) => globalThis.fetch(...args),
  }) }
})

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Curriculum typed reads', () => {
  it('creates a blank version with one catalog request and no child writes', async () => {
    const body = { program_id: '11111111-1111-4111-8111-111111111111', version_label: '2027', effective_start: '2027-08-01', effective_end: null, total_units: 0, delinquency_threshold: 0, status: 'draft' as const }
    let writes = 0
    server.use(http.post('*/functions/v1/catalog/curriculum_version', async ({ request }) => {
      writes++
      expect(await request.json()).toEqual(body)
      return HttpResponse.json({ ...body, id: 'created-version' }, { status: 201 })
    }))
    expect(await createCurriculumVersion(body)).toMatchObject({ id: 'created-version', program_id: body.program_id })
    expect(writes).toBe(1)
  })
  it('filters programs by department and versions by eligible program IDs', async () => {
    server.use(
      http.get('*/rest/v1/program', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('department_id')).toBe('eq.department')
        return HttpResponse.json([{ id: 'program', department_id: 'department' }, { id: 'foreign', department_id: 'other' }])
      }),
      http.get('*/rest/v1/curriculum_version', ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('program_id')).toBe('in.(program)')
        expect(query.get('select')).toContain('enrolled_student_count')
        return HttpResponse.json([{ id: 'v1', program_id: 'program', effective_start: '2024-08-01' }, { id: 'foreign', program_id: 'foreign', effective_start: '2020-08-01' }])
      }),
    )
    const result = await listCurricula('department')
    expect(result.programs.map(p => p.id)).toEqual(['program'])
    expect(result.versions.map(v => v.id)).toEqual(['v1'])
  })
  it('orders positional terms and batches deduplicated references instead of reading per slot', async () => {
    const courseQueries: string[] = []
    server.use(
      http.get('*/rest/v1/curriculum_term', ({ request }) => {
        expect(new URL(request.url).searchParams.get('curriculum_version_id')).toBe('eq.version')
        return HttpResponse.json([
          { id: 't2', curriculum_version_id: 'version', year_level: 2, term_sequence: 1 },
          { id: 't1', curriculum_version_id: 'version', year_level: 1, term_sequence: 2 },
          { id: 'other', curriculum_version_id: 'other-version', year_level: 1, term_sequence: 1 },
        ])
      }),
      http.get('*/rest/v1/curriculum_term_course', ({ request }) => {
        expect(new URL(request.url).searchParams.get('curriculum_term_id')).toBe('in.(t1,t2)')
        return HttpResponse.json(Array.from({ length: 52 }, (_, i) => ({ id: `s${i}`, curriculum_term_id: 't1', course_id: `c${i % 51}` })))
      }),
      http.get('*/rest/v1/course', ({ request }) => {
        const filter = new URL(request.url).searchParams.get('id')!
        courseQueries.push(filter)
        expect(filter.slice(4, -1).split(',').length).toBeLessThanOrEqual(50)
        return HttpResponse.json([])
      }),
    )
    const result = await readCurriculum('version')
    expect(result.terms.map(t => t.id)).toEqual(['t1', 't2'])
    expect(result.slots).toHaveLength(52)
    expect(courseQueries).toHaveLength(2)
  })
  it('rejects truncated reads rather than displaying an incomplete checklist', async () => {
    server.use(http.get('*/rest/v1/curriculum_term', () => HttpResponse.json(Array.from({ length: 1000 }, (_, i) => ({ id: `t${i}` })))))
    await expect(readCurriculum('version')).rejects.toThrow('complete overview could not be loaded')
  })
  it('rejects a partial response below the row cap', async () => {
    server.use(http.get('*/rest/v1/curriculum_term', () => HttpResponse.json([], { status: 206, headers: { 'Content-Range': '0-9/20' } })))
    await expect(readCurriculum('version')).rejects.toThrow('complete overview could not be loaded')
  })
  it('propagates forbidden reads and supports cancellation', async () => {
    server.use(http.get('*/rest/v1/program', () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 })))
    await expect(listCurricula('department')).rejects.toMatchObject({ isForbidden: true })
    const controller = new AbortController()
    controller.abort()
    await expect(listCurricula('department', controller.signal)).rejects.toBeTruthy()
  })
})
