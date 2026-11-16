import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import type { ApiSchema, OperationResponse } from '@/lib/api'
import DepartmentStaffPortal from '../DepartmentStaffPortal'
import { listStudentRoster } from './students.api'

vi.mock('./students.api', () => ({
  listStudentRoster: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const PROFILE_ID = '11111111-1111-4111-8111-111111111111'
const DEPARTMENT_ID = '22222222-2222-4222-8222-222222222222'
const STUDENT_ID = '33333333-3333-4333-8333-333333333333'
const STAFF_ROLE = 'department_staff'

const student: ApiSchema<'StudentRosterItem'> = {
  student_id: STUDENT_ID,
  student_number: '24-1-01798',
  full_name: 'Maria Santos',
  email: 'maria@example.edu.ph',
  status: 'active',
  faculty_id: '44444444-4444-4444-8444-444444444444',
  faculty_name: 'Faculty of Computing',
  department_id: DEPARTMENT_ID,
  department_name: 'Department of Computer Science',
  program_id: '55555555-5555-4555-8555-555555555555',
  program_code: 'BSCS',
  program_name: 'Bachelor of Science in Computer Science',
  curriculum_version_id: '66666666-6666-4666-8666-666666666666',
  curriculum_label: 'BSCS 2024-2025 v1',
  year_level: 3,
  earned_units: 36,
  required_units: 162,
  standing: 'good_standing',
  deficiencies_count: 0,
  open_inc_count: 0,
  open_flags_count: 0,
  adviser_name: 'Alex Adviser',
}

const roster: OperationResponse<'listStudentRoster'> = {
  total_count: 1,
  unassigned_count: 0,
  with_deficiencies_count: 0,
  items: [student],
}

function staffAuth(): AuthContextValue {
  const roleAssignment: ApiSchema<'RoleAssignment'> = {
    id: '77777777-7777-4777-8777-777777777777',
    profile_id: PROFILE_ID,
    role: STAFF_ROLE,
    faculty_id: null,
    department_id: DEPARTMENT_ID,
    created_at: '2026-11-16T00:00:00Z',
  }

  return {
    user: {
      id: PROFILE_ID,
      email: 'staff@example.edu.ph',
      fullName: 'Department Staff',
      primaryRole: STAFF_ROLE,
      roles: [STAFF_ROLE],
    },
    profile: null,
    session: null,
    roles: [STAFF_ROLE],
    roleAssignments: [roleAssignment],
    roleScopes: [
      { role: STAFF_ROLE, facultyId: null, departmentId: DEPARTMENT_ID },
    ],
    activeRole: STAFF_ROLE,
    primaryRole: STAFF_ROLE,
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: 'department_staff',
    signInWithPassword: async () => undefined,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    retryHydration: async () => undefined,
    setActiveRole: () => undefined,
    switchMockPersona: () => undefined,
  }
}

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
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
          <CurrentPath />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function forbiddenError(): ApiClientError {
  return new ApiClientError(
    normalizeApiError(
      { message: 'Forbidden' },
      new Response(null, { status: 403 }),
    ),
  )
}

describe('Department Staff student roster route', () => {
  it('redirects the portal index to the scoped student roster', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue(roster)
    renderPortal('/department-staff')

    await waitFor(
      () =>
        expect(screen.getByTestId('current-path').textContent).toBe(
          '/department-staff/students',
        ),
      { timeout: 5000 },
    )
    expect(await screen.findByText('Maria Santos', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText('24-1-01798')).toBeTruthy()
    expect(screen.getByText('BSCS 2024-2025 v1')).toBeTruthy()
    expect(screen.getByText('Alex Adviser')).toBeTruthy()
    expect(listStudentRoster).toHaveBeenCalledWith(
      { department_id: DEPARTMENT_ID },
      expect.any(AbortSignal),
    )
  })

  it('loads the roster when the child route is opened directly', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue(roster)
    renderPortal('/department-staff/students')

    expect(await screen.findByText('Maria Santos')).toBeTruthy()
    expect(screen.getByTestId('current-path').textContent).toBe(
      '/department-staff/students',
    )
  })

  it('renders an honest empty state when no roster rows are returned', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue({
      ...roster,
      total_count: 0,
      items: [],
    })
    renderPortal('/department-staff/students')

    expect(
      await screen.findByText('No students were returned for this department.'),
    ).toBeTruthy()
  })

  it('shows a denied state and supports a manual retry', async () => {
    vi.mocked(listStudentRoster)
      .mockRejectedValueOnce(forbiddenError())
      .mockResolvedValueOnce(roster)
    renderPortal('/department-staff/students')

    expect(
      await screen.findByText(
        'Your account is not permitted to view this department’s student roster.',
      ),
    ).toBeTruthy()
    screen.getByRole('button', { name: 'Retry' }).click()

    expect(await screen.findByText('Maria Santos')).toBeTruthy()
    await waitFor(() => expect(listStudentRoster).toHaveBeenCalledTimes(2))
  })

  it('shows a network error instead of presenting it as an empty roster', async () => {
    vi.mocked(listStudentRoster).mockRejectedValue(
      new ApiClientError(normalizeApiError(new Error('offline'))),
    )
    renderPortal('/department-staff/students')

    expect(
      await screen.findByText(
        'Could not reach the student roster service. Check your connection and retry.',
      ),
    ).toBeTruthy()
    expect(
      screen.queryByText('No students were returned for this department.'),
    ).toBeNull()
  })

  it('renders explicit not-found content for unknown child routes', async () => {
    renderPortal('/department-staff/not-a-page')

    expect(
      await screen.findByText('This Department Staff page does not exist.'),
    ).toBeTruthy()
    expect(listStudentRoster).not.toHaveBeenCalled()
  })
})
