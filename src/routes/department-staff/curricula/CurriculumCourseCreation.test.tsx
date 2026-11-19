import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import { StaffScopeContext } from '@/routes/department-staff/shared/use-staff-scope'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import type { ApiSchema } from '@/lib/api'
import { listCourseCatalogPage, listCourseCatalogReferences } from '@/routes/department-staff/course-catalog/course-catalog.api'
import { readCurriculum } from './curricula.api'
import { CurriculumSlotDialog } from './CurriculumSlotDialog'

vi.mock('@/lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, apiClient: actual.createSaaisApiClient({
    baseUrl: 'http://localhost:3000', mode: 'mock', getAccessToken: () => actual.getMockSessionToken(),
    fetch: (...args) => globalThis.fetch(...args),
  }) }
})

const persona = MOCK_PERSONAS.department_staff
const departmentId = MOCK_IDS.deptDcst
const scope = {
  status: 'ready' as const,
  departmentIds: [departmentId],
  departmentId,
  selectedDepartmentId: departmentId,
  profileId: persona.profileId,
  canQuery: true as const,
  selectDepartment: () => undefined,
}

function fixtureFromMockDatabase() {
  const db = getMockDatabase()
  const programs = db.programs.filter(program => program.department_id === departmentId)
  const programIds = new Set(programs.map(program => program.id))
  const versions = db.curriculumVersions.filter(version => programIds.has(version.program_id))
  const version = versions[0]!
  const terms = db.curriculumTerms.filter(term => term.curriculum_version_id === version.id)
  const term = terms[0]!
  const termIds = new Set(terms.map(item => item.id))
  const slots = db.curriculumTermCourses.filter(slot => termIds.has(slot.curriculum_term_id))
  const courseIds = new Set(slots.flatMap(slot => slot.course_id ? [slot.course_id] : []))
  const courses = db.courses.filter(course => courseIds.has(course.id))
  return { programs, versions, version, terms, term, slots, courses }
}

function renderSlotDialog() {
  const fixture = fixtureFromMockDatabase()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  const catalogKey = staffQueryKeys.resource(persona.profileId, departmentId, 'curricula')
  const detailKey = staffQueryKeys.resource(persona.profileId, departmentId, 'curriculum-overview', { versionId: fixture.version.id })
  const catalogCoursesKey = staffQueryKeys.resource(persona.profileId, departmentId, 'course-catalog-page')
  const catalogReferencesKey = staffQueryKeys.resource(persona.profileId, departmentId, 'course-catalog-references')
  const courseOptionsKey = staffQueryKeys.resource(persona.profileId, departmentId, 'curriculum-course-options')
  client.setQueryData(catalogKey, { programs: fixture.programs, versions: fixture.versions })
  client.setQueryData(detailKey, { terms: fixture.terms, slots: fixture.slots, courses: fixture.courses })
  client.setQueryData(catalogCoursesKey, [])
  const onCreated = vi.fn()
  render(<QueryClientProvider client={client}><StaffScopeContext.Provider value={scope}>
    <CurriculumSlotDialog term={fixture.term} version={fixture.version} onClose={vi.fn()} onCreated={onCreated} />
  </StaffScopeContext.Provider></QueryClientProvider>)
  return { ...fixture, client, catalogKey, detailKey, catalogCoursesKey, catalogReferencesKey, courseOptionsKey, onCreated }
}

beforeAll(() => saaisMockServer.listen())
beforeEach(() => { resetMockDatabase(); loginAsMockPersona('department_staff') })
afterEach(() => { cleanup(); saaisMockServer.resetHandlers(); resetMockDatabase(); logoutMockPersona() })
afterAll(() => saaisMockServer.close())

describe('Create catalog course from a curriculum requirement', () => {
  it('creates through the catalog operation, attaches the returned ID, and invalidates both resource families', async () => {
    const state = renderSlotDialog()
    const invalidation = vi.spyOn(state.client, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Create catalog course' }))
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'STEP26 CS 101' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Step Twenty Six Test Course' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '3.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))
    await screen.findByText('Course STEP26 CS 101 created. Save this requirement to attach it.')

    const createdCourse = getMockDatabase().courses.find(course => course.code === 'STEP26 CS 101')!
    fireEvent.change(screen.getByLabelText('Required units'), { target: { value: '3.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(state.onCreated).toHaveBeenCalledWith(state.version.id))

    expect(getMockDatabase().curriculumTermCourses.some(slot => slot.course_id === createdCourse.id && slot.curriculum_term_id === state.term.id)).toBe(true)
    const references = await listCourseCatalogReferences()
    const catalog = await listCourseCatalogPage(
      { search: 'STEP26 CS 101', status: '', facultyId: '', departmentId, page: 0 },
      references,
    )
    expect(catalog.courses.map(course => course.id)).toContain(createdCourse.id)
    const refreshedCurriculum = await readCurriculum(state.version.id)
    expect(refreshedCurriculum.slots.some(slot => slot.course_id === createdCourse.id)).toBe(true)
    expect(refreshedCurriculum.courses.some(course => course.id === createdCourse.id)).toBe(true)
    expect(invalidation).toHaveBeenCalledWith({ queryKey: state.catalogCoursesKey })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: state.catalogReferencesKey })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: state.courseOptionsKey })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: state.catalogKey })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: state.detailKey })
  })

  it('retains the created course ID after attachment failure and retries attachment without recreating the course', async () => {
    const state = renderSlotDialog()
    let courseCreates = 0
    let attachmentAttempts = 0
    const db = getMockDatabase()
    saaisMockServer.use(
      http.post('*/functions/v1/catalog/course', async ({ request }) => {
        courseCreates++
        const body = await request.json() as ApiSchema<'CourseInsert'>
        const created: ApiSchema<'Course'> = {
          id: '82000000-0000-4000-8000-000000000901', department_id: body.department_id,
          code: body.code, title: body.title, units: body.units, category: body.category,
          is_elective: body.is_elective, status: body.status, repeatable_type: body.repeatable_type,
        }
        db.courses.push(created)
        return HttpResponse.json(created, { status: 201 })
      }),
      http.post('*/functions/v1/catalog/curriculum_term_course', async ({ request }) => {
        attachmentAttempts++
        if (attachmentAttempts === 1) return HttpResponse.json({ message: 'Temporary attachment failure' }, { status: 500 })
        const body = await request.json() as ApiSchema<'CurriculumTermCourseInsert'>
        const attached: ApiSchema<'CurriculumTermCourse'> = { ...body, id: '82000000-0000-4000-8000-000000000902' }
        db.curriculumTermCourses.push(attached)
        return HttpResponse.json(attached, { status: 201 })
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create catalog course' }))
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'STEP26 RETRY 101' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Retryable Attachment Course' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))
    await screen.findByText('Course STEP26 RETRY 101 created. Save this requirement to attach it.')
    const created = db.courses.find(course => course.code === 'STEP26 RETRY 101')!

    const addButton = screen.getByRole('button', { name: 'Add' })
    await waitFor(() => expect(addButton.hasAttribute('disabled')).toBe(false))
    expect((screen.getByLabelText('Active course (optional)') as HTMLSelectElement).value).toBe(created.id)
    fireEvent.click(addButton)
    await waitFor(() => expect(attachmentAttempts).toBe(1), { timeout: 10_000 })
    const attachmentError = await screen.findByRole('alert', {}, { timeout: 10_000 })
    expect(attachmentError.textContent).toContain('Temporary attachment failure')
    expect(screen.getByRole('option', { name: /STEP26 RETRY 101/ })).toBeTruthy()
    expect((screen.getByLabelText('Active course (optional)') as HTMLSelectElement).value).toBe(created.id)
    expect(courseCreates).toBe(1)
    expect(db.curriculumTermCourses.some(slot => slot.course_id === created.id)).toBe(false)

    await waitFor(() => expect(addButton.hasAttribute('disabled')).toBe(false))
    fireEvent.click(addButton)
    await waitFor(() => expect(state.onCreated).toHaveBeenCalledWith(state.version.id))
    expect(attachmentAttempts).toBe(2)
    expect(courseCreates).toBe(1)
    expect(db.courses.filter(course => course.code === 'STEP26 RETRY 101')).toHaveLength(1)
    expect(db.curriculumTermCourses.find(slot => slot.id === '82000000-0000-4000-8000-000000000902')?.course_id).toBe(created.id)
  })
})
