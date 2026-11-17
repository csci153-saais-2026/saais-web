import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
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

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-location">{location.pathname}{location.search}</output>
}

function renderCourseCatalog(path = '/department-staff/course-catalog') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/department-staff/*" element={<><DepartmentStaffPortal /><LocationProbe /></>} />
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
    renderCourseCatalog('/department-staff/course-catalog?context=keep')

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

  it('filters API-inactive rows while retaining their Inactive display label', async () => {
    const database = getMockDatabase()
    database.courses[0] = { ...database.courses[0]!, status: 'inactive' }
    renderCourseCatalog('/department-staff/course-catalog?status=inactive')

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText('Inactive')).toBeTruthy()
    expect(getMockDatabase().courses[0]?.status).toBe('inactive')
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

    expect(await screen.findByText('No courses match these filters.')).toBeTruthy()
  })

  it('combines search, status, faculty, and department using contract-supported filters', async () => {
    const course = getMockDatabase().courses.find(item => item.code === 'CSCI 101')!
    const department = getMockDatabase().departments.find(item => item.id === course.department_id)!
    let requestUrl: URL | undefined
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      requestUrl = new URL(request.url)
      return HttpResponse.json([course], { headers: { 'Content-Range': '0-0/1' } })
    }))
    renderCourseCatalog(`/department-staff/course-catalog?context=preserved&q=${encodeURIComponent('C++ Systems')}&status=active&faculty=${department.faculty_id}&department=${department.id}`)

    expect(await screen.findByRole('row', { name: /CSCI 101/ })).toBeTruthy()
    await waitFor(() => expect(requestUrl).toBeDefined())
    expect(requestUrl?.searchParams.get('status')).toBe('eq.active')
    expect(requestUrl?.searchParams.get('department_id')).toBe(`eq.${department.id}`)
    expect(requestUrl?.searchParams.get('or')).toBe('(code.ilike.%C++ Systems%,title.ilike.%C++ Systems%)')
    expect(requestUrl?.searchParams.get('limit')).toBe('20')
  })

  it('searches course codes and titles through the MSW PostgREST OR handler', async () => {
    renderCourseCatalog('/department-staff/course-catalog?q=Introduction%20to%20Computing')

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText('Introduction to Computing')).toBeTruthy()
  })

  it('maps faculty reference selection to a bounded department IN filter', async () => {
    const course = getMockDatabase().courses.find(item => item.code === 'CSCI 101')!
    const department = getMockDatabase().departments.find(item => item.id === course.department_id)!
    let departmentFilter: string | null = null
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      departmentFilter = new URL(request.url).searchParams.get('department_id')
      return HttpResponse.json([course], { headers: { 'Content-Range': '0-0/1' } })
    }))
    renderCourseCatalog(`/department-staff/course-catalog?faculty=${department.faculty_id}`)

    expect(await screen.findByRole('row', { name: /CSCI 101/ })).toBeTruthy()
    const facultyDepartmentIds = getMockDatabase().departments
      .filter(item => item.faculty_id === department.faculty_id)
      .map(item => item.id)
    expect(departmentFilter).toBe(`in.(${facultyDepartmentIds.join(',')})`)
  })

  it('pages through bounded results and resets page when search changes', async () => {
    const base = getMockDatabase().courses[0]!
    const offsets: string[] = []
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      const url = new URL(request.url)
      const offset = Number(url.searchParams.get('offset') ?? 0)
      offsets.push(String(offset))
      const pageRows = Math.max(0, Math.min(20, 25 - offset))
      const rows = Array.from({ length: pageRows }, (_, index) => ({ ...base, id: `course-${offset + index}`, code: `TEST ${offset + index}` }))
      return HttpResponse.json(rows, { headers: { 'Content-Range': `${offset}-${offset + rows.length - 1}/25` } })
    }))
    renderCourseCatalog('/department-staff/course-catalog?context=keep')
    await screen.findByRole('row', { name: /TEST 0/ })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('row', { name: /TEST 20/ })
    expect(screen.getAllByText(/21.*25 of 25/)).toHaveLength(2)
    expect(offsets).toContain('20')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search courses' }), { target: { value: 'new search' } })
    await waitFor(() => expect(screen.getByTestId('current-location').textContent).not.toContain('page=1'))
    expect(screen.getByTestId('current-location').textContent).toContain('context=keep')
    await waitFor(() => expect(offsets.at(-1)).toBe('0'))
  })

  it('does not let a slower prior filter response replace the current search', async () => {
    const base = getMockDatabase().courses[0]!
    let markSlowStarted: (() => void) | undefined
    const slowStarted = new Promise<void>(resolve => { markSlowStarted = resolve })
    saaisMockServer.use(http.get('*/rest/v1/course', async ({ request }) => {
      const search = new URL(request.url).searchParams.get('or') ?? ''
      if (search.includes('slow')) {
        markSlowStarted?.()
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json([{ ...base, title: 'Slow stale result' }], { headers: { 'Content-Range': '0-0/1' } })
      }
      if (search.includes('fast')) {
        return HttpResponse.json([{ ...base, title: 'Fast current result' }], { headers: { 'Content-Range': '0-0/1' } })
      }
      return HttpResponse.json([], { headers: { 'Content-Range': '*/0' } })
    }))
    renderCourseCatalog('/department-staff/course-catalog?q=slow')
    await slowStarted
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Search courses' }), { target: { value: 'fast' } })

    expect(await screen.findByText('Fast current result')).toBeTruthy()
    await new Promise(resolve => setTimeout(resolve, 120))
    expect(screen.queryByText('Slow stale result')).toBeNull()
  })

  it('rejects PostgREST syntax and wildcard search input without sending it to the API', async () => {
    let requestCount = 0
    saaisMockServer.use(http.get('*/rest/v1/course', () => {
      requestCount += 1
      return HttpResponse.json(getMockDatabase().courses, { headers: { 'Content-Range': `0-${getMockDatabase().courses.length - 1}/${getMockDatabase().courses.length}` } })
    }))
    renderCourseCatalog()
    await screen.findByRole('row', { name: /CSCI 101/ })
    const countBefore = requestCount
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search courses' }), { target: { value: 'x),status.eq.active' } })
    expect(await screen.findByText(/PostgREST syntax, wildcard, and control characters/)).toBeTruthy()
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(requestCount).toBe(countBefore)
  })

  it('allows filtering foreign-department references without granting write controls', async () => {
    const foreignCourse = { ...getMockDatabase().courses[0]!, department_id: MOCK_IDS.deptDabe }
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      const url = new URL(request.url)
      return HttpResponse.json(url.searchParams.get('department_id') === `eq.${MOCK_IDS.deptDabe}` ? [foreignCourse] : [], {
        headers: { 'Content-Range': url.searchParams.has('department_id') ? '0-0/1' : '*/0' },
      })
    }))
    renderCourseCatalog(`/department-staff/course-catalog?department=${MOCK_IDS.deptDabe}`)

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText(/DABE/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /add|edit|delete|retire/i })).toBeNull()
  })
})
