import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { http, HttpResponse } from 'msw'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_IDS,
  MOCK_PERSONAS,
  resetMockDatabase,
} from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import DepartmentStaffPortal from '../DepartmentStaffPortal'

const staffPersona = MOCK_PERSONAS.department_staff

function staffAuth(): AuthContextValue {
  const roleAssignments = getMockDatabase().roleAssignments.filter(
    (assignment) => assignment.profile_id === staffPersona.profileId,
  )

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
    roleScopes: staffPersona.roleScopes.map((scope) => ({
      role: scope.role,
      facultyId: scope.scope_type === 'faculty' ? scope.scope_id : null,
      departmentId:
        scope.scope_type === 'department' ? scope.scope_id : null,
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

function CurrentLocation() {
  const location = useLocation()
  return (
    <>
      <output data-testid="current-path">{location.pathname}</output>
      <output data-testid="current-search">{location.search}</output>
    </>
  )
}

function renderPortal(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/department-staff/*"
              element={<DepartmentStaffPortal />}
            />
          </Routes>
          <CurrentLocation />
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

describe('Department Staff student directory', () => {
  it('renders the mockup directory with records from the staff persona MSW handler', async () => {
    renderPortal('/department-staff/students')

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Students', level: 1 },
        { timeout: 5000 },
      ),
    ).toBeTruthy()
    expect(await screen.findByText('Find and maintain student records within the Department of Computer Science and Technology.')).toBeTruthy()
    expect(
      await screen.findByText(MOCK_PERSONAS.student.fullName),
    ).toBeTruthy()
    expect(screen.getByText('Department directory')).toBeTruthy()
    expect(screen.getByText(MOCK_PERSONAS.student.email)).toBeTruthy()
    expect(screen.getByText('3rd year')).toBeTruthy()
    expect(screen.getByText(MOCK_PERSONAS.adviser.fullName)).toBeTruthy()
    expect(screen.getByText(MOCK_PERSONAS.student_secondary.fullName)).toBeTruthy()
    expect(screen.getByText(MOCK_PERSONAS.student_secondary.email)).toBeTruthy()
    expect(screen.getByText('1st year')).toBeTruthy()
    expect(screen.getByText('Unassigned')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Import spreadsheet' })).toBeTruthy()
    expect(screen.queryByText(/Staff requests are scoped to department/)).toBeNull()
    expect(screen.getByText('Showing 1–2 of 2 students')).toBeTruthy()
    const directoryPanel = screen
      .getByText('Department directory')
      .closest('[data-slot="card"]') as HTMLElement
    expect(
      within(directoryPanel).getByRole('searchbox', {
        name: 'Search students',
      }),
    ).toBeTruthy()
    expect(
      within(directoryPanel).getByRole('combobox', { name: 'Curriculum' }),
    ).toBeTruthy()
    expect(
      within(directoryPanel).getByRole('combobox', { name: 'Adviser' }),
    ).toBeTruthy()
    const directorySummary = within(directoryPanel).getByText(
      /2 enrolled students.*BSCS/,
    )
    expect(directorySummary.textContent).toMatch(
      /(?:AY \d{4} - \d{4}, (?:1st Semester|2nd Semester|Summer)|Academic year and term unavailable)/,
    )
    expect(screen.getByTestId('current-path').textContent).toBe(
      '/department-staff/students',
    )
  })

  it('applies search through the roster handler and reflects it in the URL', async () => {
    renderPortal('/department-staff/students')
    const search = await screen.findByRole('searchbox', {
      name: 'Search students',
    })

    fireEvent.change(search, {
      target: { value: MOCK_PERSONAS.student_secondary.fullName },
    })

    expect(
      await screen.findByText(MOCK_PERSONAS.student_secondary.fullName),
    ).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByText(MOCK_PERSONAS.student.fullName)).toBeNull(),
    )
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).get('search'),
    ).toBe(MOCK_PERSONAS.student_secondary.fullName)
    expect(screen.getByText('Showing 1–1 of 1 student')).toBeTruthy()
  })

  it('applies curriculum and adviser filters using existing mock records', async () => {
    renderPortal(
      `/department-staff/students?curriculum_version_id=${MOCK_IDS.curriculumBscs2024}&adviser_id=${MOCK_IDS.adviserPrimary}`,
    )

    expect(
      await screen.findByText(MOCK_PERSONAS.student.fullName),
    ).toBeTruthy()
    expect(screen.queryByText(MOCK_PERSONAS.student_secondary.fullName)).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Curriculum' }).textContent).toContain(
      'BSCS 2024-2025 v1',
    )
    expect(screen.getByRole('combobox', { name: 'Adviser' }).textContent).toContain(
      MOCK_PERSONAS.adviser.fullName,
    )
    expect(screen.getByText('Showing 1–1 of 1 student')).toBeTruthy()
  })

  it('paginates an existing roster query without introducing extra records', async () => {
    renderPortal('/department-staff/students?offset=20')

    expect(
      await screen.findByText('No students shown; 2 students match these filters'),
    ).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
    expect(
      (screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(
      await screen.findByText(MOCK_PERSONAS.student.fullName),
    ).toBeTruthy()
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).has('offset'),
    ).toBe(false)
  })

  it('clears current filters while preserving unrelated URL parameters', async () => {
    renderPortal(
      `/department-staff/students?search=${encodeURIComponent(MOCK_PERSONAS.student_secondary.fullName)}&offset=20&tab=directory`,
    )

    expect(
      await screen.findByText('No students shown; 1 student matches these filters'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(
      await screen.findByText(MOCK_PERSONAS.student.fullName),
    ).toBeTruthy()
    const params = new URLSearchParams(
      screen.getByTestId('current-search').textContent ?? '',
    )
    expect(params.get('tab')).toBe('directory')
    expect(params.has('search')).toBe(false)
    expect(params.has('offset')).toBe(false)
  })

  it('shows an honest empty state for a search with no matching existing records', async () => {
    renderPortal('/department-staff/students?search=No%20matching%20student')

    expect(
      await screen.findByText('No students match these filters.'),
    ).toBeTruthy()
    expect(screen.getByText('No students shown; 0 students match these filters')).toBeTruthy()
  })

  it('shows permission errors from MSW and retries against the default handler', async () => {
    saaisMockServer.use(
      http.get('*/functions/v1/students', () =>
        HttpResponse.json(
          { code: 'INSUFFICIENT_PRIVILEGE', message: 'Forbidden' },
          { status: 403 },
        ),
      ),
    )
    renderPortal('/department-staff/students')

    expect(
      await screen.findByText(
        'Your account is not permitted to view this department’s student roster.',
      ),
    ).toBeTruthy()
    saaisMockServer.resetHandlers()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(
      await screen.findByText(MOCK_PERSONAS.student.fullName),
    ).toBeTruthy()
  })

  it('shows filter-reference errors without treating missing options as an empty result', async () => {
    saaisMockServer.use(
      http.get('*/rest/v1/program', () =>
        HttpResponse.json(
          { code: 'SERVICE_UNAVAILABLE', message: 'Program references unavailable' },
          { status: 503 },
        ),
      ),
    )
    renderPortal('/department-staff/students')

    expect(
      await screen.findByText(/Program references unavailable/),
    ).toBeTruthy()
    expect(
      (screen.getByRole('combobox', { name: 'Curriculum' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(await screen.findByText(MOCK_PERSONAS.student.fullName)).toBeTruthy()
    expect(screen.queryByText('No students match these filters.')).toBeNull()
  })

  it('does not render a roster for an unknown nested route', async () => {
    renderPortal('/department-staff/not-a-page')

    expect(
      await screen.findByText('This Department Staff page does not exist.'),
    ).toBeTruthy()
    expect(screen.queryByText(MOCK_PERSONAS.student.fullName)).toBeNull()
  })
})
