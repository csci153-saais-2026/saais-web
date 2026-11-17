import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={['/department-staff/academic-terms']}>
          <Routes>
            <Route
              path="/department-staff/*"
              element={<DepartmentStaffPortal />}
            />
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

describe('Department Staff academic terms', () => {
  it('renders the prototype term history with records from the staff persona MSW handlers', async () => {
    renderPage()

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Academic terms', level: 1 },
        { timeout: 5000 },
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Review semester dates and manage the grade encoding period.'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        /Closing encoding prevents further grade entry for the term/,
      ),
    ).toBeTruthy()
    expect(screen.getByText('Academic term history')).toBeTruthy()
    expect(
      await screen.findByText('Encoding windows are tracked separately for each semester.'),
    ).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Academic year' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Semester' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Term dates' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Encoding deadline' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeTruthy()
    expect(screen.getByText('2026–2027')).toBeTruthy()
    expect(screen.getByText('1st semester')).toBeTruthy()
    expect(screen.getAllByText('10 Aug 2026 – 18 Dec 2026')).toHaveLength(2)
    expect(screen.getAllByText('05 Jan 2027')).toHaveLength(2)
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0)
    expect(screen.getByText('Not recorded')).toBeTruthy()
    expect(screen.getByText('1 open term · 0 closed terms')).toBeTruthy()
    const addTermButton = screen.getByRole('button', { name: 'Add a term' })
    expect(addTermButton.querySelector('svg')).not.toBeNull()
    const termRows = screen.getAllByRole('row').slice(1)
    expect(termRows).toHaveLength(2)
    expect(termRows[0]?.textContent).toContain('2026')
    expect(termRows[1]?.textContent).toContain('2025')
    expect(screen.queryByText(/Opened subjects|Team offerings/i)).toBeNull()
  })

  it('closes and reopens department encoding through the MSW handlers', async () => {
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Close encoding for 2026 - 2027 1st Semester',
      }),
    )
    expect(
      await screen.findByRole('dialog', {
        name: 'Close department grade encoding',
      }),
    ).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Closure note (optional)'), {
      target: { value: 'Term encoding completed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close grade encoding' }))

    expect(
      await screen.findByText(
        'Department grade encoding closed for 2026 - 2027, 1st Semester.',
      ),
    ).toBeTruthy()
    expect((await screen.findAllByText('Closed')).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('View term')[0]!)
    fireEvent.click(await screen.findByRole('button', { name: 'Reopen encoding' }))
    expect(
      await screen.findByRole('dialog', {
        name: 'Reopen department grade encoding',
      }),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reopen grade encoding' }))

    expect(
      await screen.findByText(
        'Department grade encoding reopened for 2026 - 2027, 1st Semester.',
      ),
    ).toBeTruthy()
    expect((await screen.findAllByText('Open')).length).toBeGreaterThan(0)
  })

  it('shows a retryable service error returned through MSW', async () => {
    saaisMockServer.use(
      http.get('*/rest/v1/school_term', () =>
        HttpResponse.json(
          { code: '42501', message: 'Forbidden', details: '', hint: '' },
          { status: 403 },
        ),
      ),
    )
    renderPage()

    expect(
      await screen.findByText(
        'Your account is not permitted to view academic terms for this department.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
})
