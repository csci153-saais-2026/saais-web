import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import { StaffScopeContext } from '@/routes/department-staff/shared/use-staff-scope'
import { CourseDialog } from './CourseDialog'
import { courseSchema } from './course.schema'

const persona = MOCK_PERSONAS.department_staff
const staffDepartment: string = MOCK_IDS.deptDcst
const scope = {
  status: 'ready' as const,
  departmentIds: [staffDepartment],
  departmentId: staffDepartment,
  selectedDepartmentId: staffDepartment,
  profileId: persona.profileId,
  canQuery: true as const,
  selectDepartment: () => undefined,
}

vi.mock('@/lib/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, apiClient: actual.createSaaisApiClient({
    baseUrl: 'http://localhost:3000', mode: 'mock', getAccessToken: () => actual.getMockSessionToken(),
    fetch: (...args) => globalThis.fetch(...args),
  }) }
})

function mount(departmentId = staffDepartment, staffScope = scope) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onCreated = vi.fn()
  render(<QueryClientProvider client={client}><StaffScopeContext.Provider value={staffScope}>
    <CourseDialog departmentId={departmentId} onCreated={onCreated} />
  </StaffScopeContext.Provider></QueryClientProvider>)
  return { client, onCreated }
}

beforeAll(() => saaisMockServer.listen())
beforeEach(() => { resetMockDatabase(); loginAsMockPersona('department_staff') })
afterEach(() => { cleanup(); saaisMockServer.resetHandlers(); resetMockDatabase(); logoutMockPersona() })
afterAll(() => saaisMockServer.close())

describe('CourseDialog', () => {
  it('validates exact catalog fields and rejects unknown or repeat-policy fields', () => {
    const invalid = { code: ' ', title: 'CS', units: 1.1, category: 'unknown', status: 'archived', repeatable_type: 'once' }
    expect(courseSchema.safeParse(invalid).success).toBe(false)
    expect(courseSchema.safeParse({ code: 'CS 201', title: 'Data Structures', units: 3.25, category: 'major', status: 'active', repeatable_type: 'none' }).success).toBe(false)
    expect(courseSchema.safeParse({ code: 'CS 201', title: 'Data Structures', units: 3.25, category: 'major', status: 'active' }).success).toBe(true)
  })

  it('creates a course for the authenticated Department Staff persona in its authorized department', async () => {
    const { onCreated } = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Create catalog course' }))
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'CS 290' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Applied Data Design' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '3.25' } })
    fireEvent.change(screen.getByLabelText('Course type'), { target: { value: 'ge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce())
    const created = getMockDatabase().courses.find(course => course.code === 'CS 290')
    expect(created).toMatchObject({
      department_id: staffDepartment, code: 'CS 290', title: 'Applied Data Design', units: 3.25,
      category: 'ge', is_elective: false, status: 'active', repeatable_type: 'none',
    })
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('blocks an unauthorized department scope before issuing the catalog mutation', async () => {
    const foreignDepartment = MOCK_IDS.deptDabe
    const invalidScope = { ...scope, departmentId: foreignDepartment, selectedDepartmentId: foreignDepartment }
    mount(foreignDepartment, invalidScope)
    fireEvent.click(screen.getByRole('button', { name: 'Create catalog course' }))
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'CS 291' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Out of scope course' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))

    await screen.findByRole('alert')
    expect(getMockDatabase().courses.some(course => course.code === 'CS 291')).toBe(false)
  })
})
