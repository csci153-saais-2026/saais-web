import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
  const view = render(
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
  return { ...view, queryClient }
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
  it('loads the lazy page and renders the exact catalog columns and labels', async () => {
    renderCourseCatalog('/department-staff/course-catalog?context=keep')

    expect(await screen.findByRole('heading', { name: 'Course catalog', level: 1 })).toBeTruthy()
    await screen.findByRole('row', { name: /CSCI 101/ })
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Code', 'Title', 'Department', 'Units', 'Type', 'Status', 'Actions', 'Prerequisites',
    ])

    const row = await screen.findByRole('row', { name: /CSCI 101/ })
    expect(within(row).getByText('Introduction to Computing')).toBeTruthy()
    expect(within(row).getByText('DCST · Department of Computer Science and Technology')).toBeTruthy()
    expect(within(row).getByText('Faculty of Computing')).toBeTruthy()
    expect(within(row).getByText('3')).toBeTruthy()
    expect(within(row).getByText('Major')).toBeTruthy()
    expect(within(row).getByText('Active')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit CSCI 101' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Discontinue CSCI 101' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete CSCI 101' })).toBeTruthy()
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
      ...getMockDatabase().courses.find(course => course.id === MOCK_IDS.courseCsci102)!,
      department_id: MOCK_IDS.deptDabe,
    }
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      const url = new URL(request.url)
      const idFilter = url.searchParams.get('id') ?? ''
      if (idFilter.startsWith('in.(')) {
        const referenceIds = idFilter.slice(4, -1).split(',')
        const references = getMockDatabase().courses.filter(course => referenceIds.includes(course.id))
        return HttpResponse.json(references, { headers: { 'Content-Range': references.length ? `0-${references.length - 1}/${references.length}` : '*/0' } })
      }
      return HttpResponse.json([outsideDepartmentCourse], { headers: { 'Content-Range': '0-0/1' } })
    }))
    renderCourseCatalog()

    const row = await screen.findByRole('row', { name: /CSCI 102/ })
    expect(within(row).getByText('DABE · Department of Agricultural and Biosystems Engineering')).toBeTruthy()
    expect(within(row).getByText('Faculty of Engineering and Technology')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add course' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /edit|delete|retire/i })).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 102' }))
    expect(await screen.findByText('Prerequisite')).toBeTruthy()
    expect(screen.getByText(/CSCI 101/)).toBeTruthy()
  })

  it('labels strict, co-requisite, and recommended relationships without implying equivalence', async () => {
    const database = getMockDatabase()
    const relationship = database.prerequisites[0]!
    database.prerequisites.push(
      { ...relationship, id: '51000000-0000-4000-8000-000000000091', course_id: MOCK_IDS.courseCsci198, prerequisite_course_id: MOCK_IDS.courseCsci101, type: 'strict' },
      { ...relationship, id: '51000000-0000-4000-8000-000000000092', course_id: MOCK_IDS.courseCsci198, prerequisite_course_id: MOCK_IDS.courseCsci102, type: 'co_requisite' },
      { ...relationship, id: '51000000-0000-4000-8000-000000000093', course_id: MOCK_IDS.courseCsci198, prerequisite_course_id: MOCK_IDS.courseCsci153, type: 'recommended' },
    )
    renderCourseCatalog()
    const row = await screen.findByRole('row', { name: /CSCI 198/ })
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 198' }))

    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    const relationshipList = await within(dialog).findByRole('list', { name: 'Prerequisite relationships' })
    expect(within(relationshipList).getByText('Prerequisite')).toBeTruthy()
    expect(within(relationshipList).getByText('Co-requisite')).toBeTruthy()
    expect(within(relationshipList).getByText('Recommended')).toBeTruthy()
    expect(within(relationshipList).getByText(/CSCI 101/)).toBeTruthy()
    expect(within(relationshipList).getByText(/CSCI 102/)).toBeTruthy()
    expect(within(relationshipList).getByText(/CSCI 153/)).toBeTruthy()
    expect(within(dialog).getByText(/Recommended relationships are advisory/)).toBeTruthy()
    expect(within(dialog).getByText(/Similar course codes do not imply equivalence/)).toBeTruthy()
  })

  it('switches the selected course, shows the empty state, and returns focus to the opener', async () => {
    renderCourseCatalog()
    const prerequisiteTrigger = await screen.findByRole('button', { name: 'View prerequisites for CSCI 102' })
    fireEvent.click(prerequisiteTrigger)
    const firstDialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    const firstList = await within(firstDialog).findByRole('list', { name: 'Prerequisite relationships' })
    expect(within(firstList).getByText('Prerequisite')).toBeTruthy()
    fireEvent.click(within(firstDialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(prerequisiteTrigger))

    const emptyTrigger = screen.getByRole('button', { name: 'View prerequisites for CSCI 101' })
    fireEvent.click(emptyTrigger)
    const emptyDialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    expect(await within(emptyDialog).findByText('No prerequisite relationships are recorded for this course.')).toBeTruthy()
    expect(within(emptyDialog).queryByText('CSCI 101')).toBeNull()
  })

  it('shows prerequisite loading and recoverable error states, then retries', async () => {
    let releaseResponse: (() => void) | undefined
    let requestStarted: (() => void) | undefined
    const started = new Promise<void>(resolve => { requestStarted = resolve })
    const responseGate = new Promise<void>(resolve => { releaseResponse = resolve })
    saaisMockServer.use(http.get('*/rest/v1/prerequisite', async () => {
      requestStarted?.()
      await responseGate
      return HttpResponse.json({ code: 'SERVICE_UNAVAILABLE', message: 'Prerequisites are temporarily unavailable.' }, { status: 503 })
    }))
    renderCourseCatalog()
    fireEvent.click(await screen.findByRole('button', { name: 'View prerequisites for CSCI 102' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    await started
    expect(within(dialog).getByRole('status').textContent).toContain('Loading prerequisite relationships')
    releaseResponse?.()
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Prerequisites are temporarily unavailable.')

    saaisMockServer.resetHandlers()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }))
    const relationshipList = await within(dialog).findByRole('list', { name: 'Prerequisite relationships' })
    expect(within(relationshipList).getByText('Prerequisite')).toBeTruthy()
  })

  it.each([
    ['strict', 'Prerequisite'],
    ['co_requisite', 'Co-requisite'],
    ['recommended', 'Recommended'],
  ] as const)('creates a %s prerequisite linkage using the approved POST payload', async (type, label) => {
    const database = getMockDatabase()
    const catalogRow = await (async () => {
      renderCourseCatalog()
      return screen.findByRole('row', { name: /CSCI 198/ })
    })()
    fireEvent.click(within(catalogRow).getByRole('button', { name: 'View prerequisites for CSCI 198' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    const courseChoice = await within(dialog).findByLabelText('Course') as HTMLSelectElement
    const selectableIds = Array.from(courseChoice.options).filter(option => option.value).map(option => option.value)
    expect(selectableIds.every(id => database.courses.find(candidate => candidate.id === id)?.department_id === MOCK_IDS.deptDcst)).toBe(true)
    fireEvent.change(courseChoice, { target: { value: MOCK_IDS.courseCsci101 } })
    fireEvent.change(within(dialog).getByLabelText('Relationship type'), { target: { value: type } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add relationship' }))

    await within(dialog).findByText(label)
    const relationshipList = await within(dialog).findByRole('list', { name: 'Prerequisite relationships' })
    expect(within(relationshipList).getByText(label)).toBeTruthy()
    expect(within(relationshipList).getByText(/CSCI 101/)).toBeTruthy()
    expect(database.prerequisites).toContainEqual(expect.objectContaining({
      course_id: MOCK_IDS.courseCsci198,
      prerequisite_course_id: MOCK_IDS.courseCsci101,
      type,
    }))
  })

  it('prevents self-links and duplicate links with visible feedback', async () => {
    renderCourseCatalog()
    const row = await screen.findByRole('row', { name: /CSCI 102/ })
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 102' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    const courseChoice = await within(dialog).findByLabelText('Course') as HTMLSelectElement
    expect(within(courseChoice).getByRole('option', { name: /CSCI 102.*cannot link to itself/ }).hasAttribute('disabled')).toBe(true)
    expect(within(courseChoice).getByRole('option', { name: /CSCI 101.*already linked/ }).hasAttribute('disabled')).toBe(true)

    fireEvent.change(courseChoice, { target: { value: MOCK_IDS.courseCsci101 } })
    expect(await within(dialog).findByText('This course is already linked and cannot be added again.')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Add relationship' }).hasAttribute('disabled')).toBe(true)
    fireEvent.change(courseChoice, { target: { value: MOCK_IDS.courseCsci102 } })
    expect(await within(dialog).findByText('A course cannot be linked as its own prerequisite.')).toBeTruthy()
  })

  it('sends a department filter for bounded prerequisite candidate reads', async () => {
    let requestedDepartment = ''
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      const url = new URL(request.url)
      requestedDepartment = url.searchParams.get('department_id') ?? ''
      const departmentId = requestedDepartment.replace(/^eq\./, '')
      const candidates = getMockDatabase().courses.filter(course => course.department_id === departmentId)
      return HttpResponse.json(candidates, {
        headers: { 'Content-Range': candidates.length ? `0-${candidates.length - 1}/${candidates.length}` : '*/0' },
      })
    }))
    const { listDepartmentPrerequisiteCandidates } = await import('./course-catalog.api')

    const candidates = await listDepartmentPrerequisiteCandidates(MOCK_IDS.deptDcst)

    expect(requestedDepartment).toBe(`eq.${MOCK_IDS.deptDcst}`)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every(course => course.department_id === MOCK_IDS.deptDcst)).toBe(true)
  })

  it('adds and removes relationships, supports cancel, and never sends a PATCH', async () => {
    let patchCalls = 0
    saaisMockServer.use(http.patch('*/functions/v1/catalog/prerequisite/:id', () => {
      patchCalls += 1
      return new HttpResponse(null, { status: 204 })
    }))
    renderCourseCatalog()
    const row = await screen.findByRole('row', { name: /CSCI 153/ })
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 153' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    expect(await within(dialog).findByText('CSCI 102')).toBeTruthy()
    const removeButton = within(dialog).getByRole('button', { name: 'Remove CSCI 102' })
    fireEvent.click(removeButton)
    const confirmation = within(dialog).getByLabelText('Confirm removal of CSCI 102')
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    expect(await within(dialog).findByText('CSCI 102')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove CSCI 102' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm remove' }))
    await within(dialog).findByText('No prerequisite relationships are recorded for this course.')
    expect(getMockDatabase().prerequisites.some(item => item.id === MOCK_IDS.prereqCsci153Requires102)).toBe(false)
    expect(patchCalls).toBe(0)
  })

  it.each([
    [403, 'FORBIDDEN', 'Your account is not permitted to change prerequisite relationships'],
    [409, 'PREREQUISITE_CONFLICT', 'already exists'],
  ])('surfaces server %s responses when adding a relationship', async (status, code, message) => {
    saaisMockServer.use(http.post('*/functions/v1/catalog/prerequisite', () => HttpResponse.json({ code, message }, { status })))
    renderCourseCatalog()
    const row = await screen.findByRole('row', { name: /CSCI 198/ })
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 198' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    fireEvent.change(await within(dialog).findByLabelText('Course'), { target: { value: MOCK_IDS.courseCsci101 } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add relationship' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain(message)
  })

  it.each([
    [403, 'FORBIDDEN', 'Your account is not permitted to change prerequisite relationships'],
    [409, 'PREREQUISITE_CONFLICT', 'protected relationship'],
  ])('surfaces server %s responses when removing a relationship', async (status, code, message) => {
    saaisMockServer.use(http.delete('*/functions/v1/catalog/prerequisite/:id', () => HttpResponse.json({ code, message }, { status })))
    renderCourseCatalog()
    const row = await screen.findByRole('row', { name: /CSCI 153/ })
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 153' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    await within(dialog).findByText('CSCI 102')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove CSCI 102' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm remove' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain(message)
    expect(getMockDatabase().prerequisites.some(item => item.id === MOCK_IDS.prereqCsci153Requires102)).toBe(true)
  })

  it('keeps prerequisite editing hidden for permitted read-only foreign-department courses', async () => {
    const foreignCourse = {
      ...getMockDatabase().courses.find(course => course.id === MOCK_IDS.courseCsci102)!,
      department_id: MOCK_IDS.deptDabe,
    }
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      const url = new URL(request.url)
      const idFilter = url.searchParams.get('id') ?? ''
      if (idFilter.startsWith('in.(')) {
        const ids = idFilter.slice(4, -1).split(',')
        const references = getMockDatabase().courses.filter(course => ids.includes(course.id))
        return HttpResponse.json(references, { headers: { 'Content-Range': references.length ? `0-${references.length - 1}/${references.length}` : '*/0' } })
      }
      return HttpResponse.json([foreignCourse], { headers: { 'Content-Range': '0-0/1' } })
    }))
    renderCourseCatalog()
    const row = await screen.findByRole('row', { name: /CSCI 102/ })
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 102' }))
    const dialog = await screen.findByRole('dialog', { name: 'Prerequisite relationships' })
    expect(await within(dialog).findByText('Prerequisite')).toBeTruthy()
    expect(within(dialog).queryByRole('heading', { name: 'Add relationship' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /Remove/ })).toBeNull()
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
    const foreignCourse = { ...getMockDatabase().courses.find(course => course.id === MOCK_IDS.courseCsci102)!, department_id: MOCK_IDS.deptDabe }
    saaisMockServer.use(http.get('*/rest/v1/course', ({ request }) => {
      const url = new URL(request.url)
      const idFilter = url.searchParams.get('id') ?? ''
      if (idFilter.startsWith('in.(')) {
        const referenceIds = idFilter.slice(4, -1).split(',')
        const references = getMockDatabase().courses.filter(course => referenceIds.includes(course.id))
        return HttpResponse.json(references, { headers: { 'Content-Range': references.length ? `0-${references.length - 1}/${references.length}` : '*/0' } })
      }
      const matchesDepartment = url.searchParams.get('department_id') === `eq.${MOCK_IDS.deptDabe}`
      return HttpResponse.json(matchesDepartment ? [foreignCourse] : [], { headers: { 'Content-Range': matchesDepartment ? '0-0/1' : '*/0' } })
    }))
    renderCourseCatalog(`/department-staff/course-catalog?department=${MOCK_IDS.deptDabe}`)

    const row = await screen.findByRole('row', { name: /CSCI 102/ })
    expect(within(row).getByText(/DABE/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add course' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /edit|delete|retire/i })).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: 'View prerequisites for CSCI 102' }))
    expect(await screen.findByText('Prerequisite')).toBeTruthy()
    expect(screen.getByText(/CSCI 101/)).toBeTruthy()
  })

  it('updates only approved mutable fields and refreshes catalog and curriculum data without changing filter context', async () => {
    const { queryClient } = renderCourseCatalog('/department-staff/course-catalog?status=active&context=keep')
    const course = getMockDatabase().courses.find(item => item.code === 'CSCI 101')!
    const curriculaKey = ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curricula', {}]
    const activeKey = ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-overview', { versionId: 'active-v1' }]
    const historicalKey = ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-overview', { versionId: 'historical-v1' }]
    const historicalSnapshot = { slots: [{ course_id: course.id }], title: 'Frozen curriculum snapshot' }
    let requestBody: Record<string, unknown> | undefined
    saaisMockServer.use(http.patch('*/functions/v1/catalog/course/:id', async ({ request, params }) => {
      requestBody = await request.json() as Record<string, unknown>
      const database = getMockDatabase()
      const index = database.courses.findIndex(item => item.id === String(params.id))
      database.courses[index] = { ...database.courses[index]!, ...requestBody } as typeof database.courses[number]
      return HttpResponse.json(database.courses[index])
    }))

    await screen.findByRole('row', { name: /CSCI 101/ })
    queryClient.setQueryData(curriculaKey, { versions: [
      { id: 'active-v1', status: 'active' }, { id: 'historical-v1', status: 'retired' },
    ] })
    queryClient.setQueryData(activeKey, { slots: [{ course_id: course.id }], title: 'Active curriculum' })
    queryClient.setQueryData(historicalKey, historicalSnapshot)
    expect(queryClient.getQueryData(curriculaKey)).toBeDefined()
    expect(queryClient.getQueriesData({ queryKey: ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-overview'] })).toHaveLength(2)
    const setQueryData = vi.spyOn(queryClient, 'setQueryData')
    const invalidation = vi.spyOn(queryClient, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Edit CSCI 101' }))
    expect(screen.getByRole('heading', { name: 'Edit catalog course' })).toBeTruthy()
    expect((screen.getByLabelText('Course title') as HTMLInputElement).value).toBe(course.title)
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'CSCI 101A' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Revised Computing Foundations' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '3.5' } })
    fireEvent.change(screen.getByLabelText('Course type'), { target: { value: 'elective' } })
    fireEvent.change(screen.getByLabelText('Status', { selector: 'select' }), { target: { value: 'discontinued' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(requestBody).toBeDefined())
    expect(Object.keys(requestBody!).sort()).toEqual(['category', 'code', 'is_elective', 'status', 'title', 'units'])
    expect(requestBody).toEqual({
      code: 'CSCI 101A', title: 'Revised Computing Foundations', units: 3.5,
      category: 'elective', is_elective: true, status: 'discontinued',
    })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'course-catalog-page']) })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'course-catalog-references']) })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-course-options']) })
    expect(invalidation).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-overview'],
      predicate: expect.any(Function),
    }))
    const overviewInvalidation = invalidation.mock.calls
      .map(([filters]) => filters)
      .find(filters => filters.queryKey?.[3] === 'curriculum-overview')
    expect(overviewInvalidation?.predicate?.({ queryKey: activeKey, state: { data: { slots: [{ course_id: course.id }] } } } as never)).toBe(true)
    expect(overviewInvalidation?.predicate?.({ queryKey: historicalKey, state: { data: historicalSnapshot } } as never)).toBe(false)
    expect(setQueryData.mock.calls.some(([key]) => key.includes('curriculum-overview'))).toBe(false)
    expect(screen.getByTestId('current-location').textContent).toContain('status=active')
    expect(screen.getByTestId('current-location').textContent).toContain('context=keep')
  })

  it('cancels course deletion without sending a request', async () => {
    let deletes = 0
    saaisMockServer.use(http.delete('*/functions/v1/catalog/course/:id', () => {
      deletes += 1
      return new HttpResponse(null, { status: 204 })
    }))
    renderCourseCatalog()
    await screen.findByRole('row', { name: /CSCI 101/ })
    fireEvent.click(screen.getByRole('button', { name: 'Delete CSCI 101' }))
    expect(screen.getByRole('heading', { name: 'Delete catalog course?' })).toBeTruthy()
    expect(screen.getByText(/CSCI 101 · Introduction to Computing/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Delete catalog course?' })).toBeNull())
    expect(deletes).toBe(0)
    expect(getMockDatabase().courses.some(course => course.id === MOCK_IDS.courseCsci101)).toBe(true)
  })

  it('deletes an unreferenced course once after confirmation and preserves filter context', async () => {
    const { createCatalogCourse } = await import('./course-catalog.api')
    const created = await createCatalogCourse({
      department_id: MOCK_IDS.deptDcst,
      code: 'CSCI 297',
      title: 'Temporary Catalog Course',
      units: 1,
      category: 'major',
      is_elective: false,
      status: 'active',
      repeatable_type: 'none',
    })
    let deletes = 0
    saaisMockServer.use(http.delete('*/functions/v1/catalog/course/:id', ({ params }) => {
      deletes += 1
      const database = getMockDatabase()
      const index = database.courses.findIndex(course => course.id === String(params.id))
      if (index >= 0) database.courses.splice(index, 1)
      return new HttpResponse(null, { status: 204 })
    }))
    renderCourseCatalog('/department-staff/course-catalog?status=active&context=keep')
    await screen.findByRole('row', { name: /CSCI 297/ })
    fireEvent.click(screen.getByRole('button', { name: 'Delete CSCI 297' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete course' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete course' }))

    await waitFor(() => expect(deletes).toBe(1))
    await waitFor(() => expect(screen.queryByRole('row', { name: /CSCI 297/ })).toBeNull())
    expect(getMockDatabase().courses.some(course => course.id === created.id)).toBe(false)
    expect(screen.getByTestId('current-location').textContent).toContain('status=active')
    expect(screen.getByTestId('current-location').textContent).toContain('context=keep')
  })

  it('surfaces history-protected deletion conflicts without removing the course', async () => {
    renderCourseCatalog()
    await screen.findByRole('row', { name: /CSCI 101/ })
    fireEvent.click(screen.getByRole('button', { name: 'Delete CSCI 101' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete course' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/protected by curriculum, offering, prerequisite, or attempt history/i)
    expect(getMockDatabase().courses.some(course => course.id === MOCK_IDS.courseCsci101)).toBe(true)
    expect(screen.getByRole('heading', { name: 'Delete catalog course?' })).toBeTruthy()
  })

  it('discontinues through status-only update and refreshes live curriculum references without changing filters', async () => {
    const { queryClient } = renderCourseCatalog('/department-staff/course-catalog?status=active&context=keep')
    const course = getMockDatabase().courses.find(item => item.id === MOCK_IDS.courseCsci101)!
    const curriculaKey = ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curricula', {}]
    const activeKey = ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-overview', { versionId: 'active-v1' }]
    const historicalKey = ['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-overview', { versionId: 'historical-v1' }]
    const invalidation = vi.spyOn(queryClient, 'invalidateQueries')
    let requestBody: unknown
    saaisMockServer.use(http.patch('*/functions/v1/catalog/course/:id', async ({ request, params }) => {
      requestBody = await request.json()
      const database = getMockDatabase()
      const index = database.courses.findIndex(item => item.id === String(params.id))
      database.courses[index] = { ...database.courses[index]!, status: 'discontinued' }
      return HttpResponse.json(database.courses[index])
    }))
    await screen.findByRole('row', { name: /CSCI 101/ })
    queryClient.setQueryData(curriculaKey, { versions: [
      { id: 'active-v1', status: 'active' }, { id: 'historical-v1', status: 'retired' },
    ] })
    queryClient.setQueryData(activeKey, { slots: [{ course_id: course.id }] })
    queryClient.setQueryData(historicalKey, { slots: [{ course_id: course.id }] })
    fireEvent.click(screen.getByRole('button', { name: 'Discontinue CSCI 101' }))
    expect(screen.getByRole('heading', { name: 'Discontinue catalog course?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discontinue course' }))

    await waitFor(() => expect(requestBody).toEqual({ status: 'discontinued' }))
    await waitFor(() => expect(screen.queryByRole('row', { name: /CSCI 101/ })).toBeNull())
    expect(getMockDatabase().courses.find(item => item.id === course.id)?.status).toBe('discontinued')
    const { listCurriculumCourses } = await import('../curricula/curricula.api')
    const refreshedOptions = await listCurriculumCourses(MOCK_IDS.deptDcst)
    expect(refreshedOptions.some(item => item.id === course.id)).toBe(false)
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'course-catalog-page']) })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'curriculum-course-options']) })
    const overviewInvalidation = invalidation.mock.calls.map(([filters]) => filters).find(filters => filters.queryKey?.[3] === 'curriculum-overview')
    expect(overviewInvalidation?.predicate?.({ queryKey: activeKey, state: { data: { slots: [{ course_id: course.id }] } } } as never)).toBe(true)
    expect(overviewInvalidation?.predicate?.({ queryKey: historicalKey, state: { data: { slots: [{ course_id: course.id }] } } } as never)).toBe(false)
    expect(screen.getByTestId('current-location').textContent).toContain('status=active')
    expect(screen.getByTestId('current-location').textContent).toContain('context=keep')
  })

  it('blocks invalid update values without making a request', async () => {
    let requests = 0
    saaisMockServer.use(http.patch('*/functions/v1/catalog/course/:id', () => {
      requests += 1
      return HttpResponse.json({ message: 'Invalid input should not be submitted.' }, { status: 500 })
    }))
    renderCourseCatalog()
    await screen.findByRole('row', { name: /CSCI 101/ })
    fireEvent.click(screen.getByRole('button', { name: 'Edit CSCI 101' }))
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Enter more than zero units.')).toBeTruthy()
    expect(requests).toBe(0)
  })

  it.each([
    [403, 'INSUFFICIENT_PRIVILEGE', 'permission to edit'],
    [409, '23505', 'already exists'],
    [409, 'STALE_RECORD', 'changed since it was loaded'],
  ])('keeps the edit form available after server status %s (%s)', async (status, code, message) => {
    saaisMockServer.use(http.patch('*/functions/v1/catalog/course/:id', () => HttpResponse.json(
      { code, message: 'The server rejected the update.' },
      { status },
    )))
    renderCourseCatalog()
    await screen.findByRole('row', { name: /CSCI 101/ })
    fireEvent.click(screen.getByRole('button', { name: 'Edit CSCI 101' }))
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Unsaved edit retained' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect((await screen.findByRole('alert')).textContent).toContain(message)
    expect((screen.getByLabelText('Course title') as HTMLInputElement).value).toBe('Unsaved edit retained')
    expect(screen.getByRole('heading', { name: 'Edit catalog course' })).toBeTruthy()
  })

  it('opens the shared course form from Add course and refreshes catalog queries without changing filters', async () => {
    const { queryClient } = renderCourseCatalog('/department-staff/course-catalog?status=active&context=keep')
    await screen.findByRole('row', { name: /CSCI 101/ })
    const invalidation = vi.spyOn(queryClient, 'invalidateQueries')
    fireEvent.click(screen.getByRole('button', { name: 'Add course' }))

    expect(screen.getByRole('heading', { name: 'Create catalog course' })).toBeTruthy()
    expect((screen.getByDisplayValue(/DCST/) as HTMLInputElement).value).toContain('DCST')
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'CS 295' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Reliable Systems' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '3.25' } })
    fireEvent.change(screen.getByLabelText('Course type'), { target: { value: 'non_elective' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))

    expect(await screen.findByRole('row', { name: /CS 295/ })).toBeTruthy()
    expect(getMockDatabase().courses.find(course => course.code === 'CS 295')).toMatchObject({
      department_id: MOCK_IDS.deptDcst,
      category: 'major',
      is_elective: false,
      units: 3.25,
      status: 'active',
    })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'course-catalog-page']) })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['staff', staffPersona.profileId, MOCK_IDS.deptDcst, 'course-catalog-references']) })
    expect(screen.getByTestId('current-location').textContent).toContain('status=active')
    expect(screen.getByTestId('current-location').textContent).toContain('context=keep')
  })

  it('blocks zero units in the shared form without sending a create request', async () => {
    let requests = 0
    saaisMockServer.use(http.post('*/functions/v1/catalog/course', () => {
      requests += 1
      return HttpResponse.json({ code: 'UNEXPECTED', message: 'Should not submit invalid units.' }, { status: 500 })
    }))
    renderCourseCatalog()
    fireEvent.click(await screen.findByRole('button', { name: 'Add course' }))
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'CS 296' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Zero Unit Course' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))

    expect(await screen.findByText('Enter more than zero units.')).toBeTruthy()
    expect(requests).toBe(0)
    expect(getMockDatabase().courses.some(course => course.code === 'CS 296')).toBe(false)
  })

  it('shows a duplicate-code conflict and keeps the entered values', async () => {
    saaisMockServer.use(http.post('*/functions/v1/catalog/course', () => HttpResponse.json(
      { code: 'CONFLICT', message: 'Course code already exists in this department.' },
      { status: 409 },
    )))
    renderCourseCatalog()
    fireEvent.click(await screen.findByRole('button', { name: 'Add course' }))
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'CSCI 101' } })
    fireEvent.change(screen.getByLabelText('Course title'), { target: { value: 'Duplicate Course Code' } })
    fireEvent.change(screen.getByLabelText('Units'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }))

    expect((await screen.findByRole('alert')).textContent).toContain('already in use')
    expect((screen.getByLabelText('Course code') as HTMLInputElement).value).toBe('CSCI 101')
    expect(getMockDatabase().courses.filter(course => course.code === 'CSCI 101')).toHaveLength(1)
  })
})
