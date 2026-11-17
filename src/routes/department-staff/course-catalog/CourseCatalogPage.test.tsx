import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import DepartmentStaffPortal from '../DepartmentStaffPortal'

const staffPersona = MOCK_PERSONAS.department_staff

function staffAuth(): AuthContextValue {
  const roleAssignments = getMockDatabase().roleAssignments.filter(assignment => assignment.profile_id === staffPersona.profileId)
  return {
    user: {
      id: staffPersona.profileId,
      email: staffPersona.email,
      fullName: staffPersona.fullName,
      primaryRole: staffPersona.primaryRole,
      roles: staffPersona.roles,
      facultyId: staffPersona.facultyId,
      departmentId: staffPersona.departmentId,
    },
    profile: null,
    session: null,
    roles: staffPersona.roles,
    roleAssignments,
    roleScopes: staffPersona.roleScopes.map(scope => ({
      role: scope.role,
      facultyId: scope.scope_type === 'faculty' ? scope.scope_id : null,
      departmentId: scope.scope_type === 'department' ? scope.scope_id : null,
    })),
    activeRole: staffPersona.primaryRole,
    primaryRole: staffPersona.primaryRole,
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: staffPersona.key,
    signInWithPassword: async () => undefined,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    retryHydration: async () => undefined,
    setActiveRole: () => undefined,
    switchMockPersona: () => undefined,
  }
}

function renderCourseCatalog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={['/department-staff/course-catalog']}>
          <Routes>
            <Route path="/department-staff/*" element={<DepartmentStaffPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

beforeAll(() => saaisMockServer.listen())
beforeEach(() => {
  resetMockDatabase()
  loginAsMockPersona('department_staff')
})
afterEach(() => {
  cleanup()
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})
afterAll(() => saaisMockServer.close())

describe('Department Staff course catalog', () => {
  it('loads the lazy page and renders the exact read-only catalog columns and labels', async () => {
    renderCourseCatalog()

    expect(await screen.findByRole('heading', { name: 'Course catalog', level: 1 })).toBeTruthy()
    await screen.findByRole('row', { name: /CSCI 101/ })
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Code', 'Title', 'Department', 'Units', 'Type', 'Status',
    ])

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText('Introduction to Computing')).toBeTruthy()
    expect(within(row).getByText('DCST · Department of Computer Science and Technology')).toBeTruthy()
    expect(within(row).getByText('Faculty of Computing')).toBeTruthy()
    expect(within(row).getByText('3')).toBeTruthy()
    expect(within(row).getByText('Major')).toBeTruthy()
    expect(within(row).getByText('Active')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /add|edit|delete|retire/i })).toBeNull()
  })

  it('displays discontinued courses as Inactive without changing the API value', async () => {
    const database = getMockDatabase()
    database.courses[0] = { ...database.courses[0], status: 'discontinued' }
    renderCourseCatalog()

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText('Inactive')).toBeTruthy()
    expect(within(row).queryByText('Discontinued')).toBeNull()
    expect(getMockDatabase().courses[0]?.status).toBe('discontinued')
  })

  it('keeps rows visible and labels missing catalog fields instead of rendering blanks', async () => {
    const course = getMockDatabase().courses[0]!
    saaisMockServer.use(http.get('*/rest/v1/course', () => HttpResponse.json([
      { ...course, title: '', units: undefined, category: undefined },
    ], { headers: { 'Content-Range': '0-0/1' } })))
    renderCourseCatalog()

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getAllByText('Not provided')).toHaveLength(3)
    expect(within(row).getByText('Active')).toBeTruthy()
  })

  it('shows permitted outside-department references without offering catalog write actions', async () => {
    const outsideDepartmentCourse = {
      ...getMockDatabase().courses[0]!,
      department_id: MOCK_IDS.deptDabe,
    }
    saaisMockServer.use(http.get('*/rest/v1/course', () => HttpResponse.json(
      [outsideDepartmentCourse],
      { headers: { 'Content-Range': '0-0/1' } },
    )))
    renderCourseCatalog()

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText('DABE · Department of Agricultural and Biosystems Engineering')).toBeTruthy()
    expect(within(row).getByText('Faculty of Engineering and Technology')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /add|edit|delete|retire/i })).toBeNull()
  })

  it.each([
    ['course catalog', '*/rest/v1/course'],
    ['department references', '*/rest/v1/department'],
    ['faculty references', '*/rest/v1/faculty'],
  ])('shows a recoverable error when %s cannot be read', async (_resource, path) => {
    saaisMockServer.use(http.get(path, () => HttpResponse.json(
      { code: 'SERVICE_UNAVAILABLE', message: 'Reference service unavailable' },
      { status: 503 },
    )))
    renderCourseCatalog()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Reference service unavailable')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()

    saaisMockServer.resetHandlers()
    screen.getByRole('button', { name: 'Retry' }).click()
    expect(await screen.findByText('Introduction to Computing')).toBeTruthy()
  })

  it('wraps long course titles in the responsive narrow-screen table layout', async () => {
    const longTitle = 'An exceptionally long course title that should wrap naturally within a narrow mobile catalog card without forcing horizontal overflow'
    const course = { ...getMockDatabase().courses[0]!, title: longTitle }
    saaisMockServer.use(http.get('*/rest/v1/course', () => HttpResponse.json(
      [course],
      { headers: { 'Content-Range': '0-0/1' } },
    )))
    renderCourseCatalog()

    const title = await screen.findByText(longTitle)
    expect(title.className).toContain('break-words')
    expect(screen.getByRole('table').className).toContain('stack-table')
    expect(title.closest('td')?.className).toContain('whitespace-normal')
  })

  it('shows an explicit empty state when the authorized catalog contains no courses', async () => {
    saaisMockServer.use(http.get('*/rest/v1/course', () => HttpResponse.json(
      [],
      { headers: { 'Content-Range': '*/0' } },
    )))
    renderCourseCatalog()

    expect(await screen.findByText('No courses are available in the catalog.')).toBeTruthy()
  })
})
