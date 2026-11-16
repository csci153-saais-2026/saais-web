import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import type { ApiSchema, OperationResponse } from '@/lib/api'
import DepartmentStaffPortal from '../DepartmentStaffPortal'
import {
  listStudentFilterOptions,
  listStudentRoster,
} from './students.api'

vi.mock('./students.api', () => ({
  listStudentFilterOptions: vi.fn(),
  listStudentRoster: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listStudentFilterOptions).mockResolvedValue(filterOptions)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const PROFILE_ID = '11111111-1111-4111-8111-111111111111'
const DEPARTMENT_ID = '22222222-2222-4222-8222-222222222222'
const STUDENT_ID = '33333333-3333-4333-8333-333333333333'
const CURRICULUM_ID = '66666666-6666-4666-8666-666666666666'
const ADVISER_ID = '88888888-8888-4888-8888-888888888888'
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
  curriculum_version_id: CURRICULUM_ID,
  curriculum_label: 'BSCS 2024-2025 v1',
  year_level: 3,
  earned_units: 36,
  required_units: 162,
  standing: 'good_standing',
  deficiencies_count: 0,
  open_inc_count: 0,
  open_flags_count: 0,
  adviser_id: ADVISER_ID,
  adviser_name: 'Alex Adviser',
}

const filterOptions = {
  curricula: [{ id: CURRICULUM_ID, label: 'BSCS — BSCS 2024-2025 v1' }],
  advisers: [{ id: ADVISER_ID, label: 'Alex Adviser' }],
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
    expect(screen.getAllByText('Alex Adviser')).toHaveLength(2)
    expect(listStudentRoster).toHaveBeenCalledWith(
      { department_id: DEPARTMENT_ID, limit: 20, offset: 0 },
      expect.any(AbortSignal),
    )
    expect(listStudentFilterOptions).toHaveBeenCalledWith(
      DEPARTMENT_ID,
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

  it('sends combined URL filters and pagination to the typed roster query', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue({
      ...roster,
      total_count: 45,
    })
    renderPortal(
      `/department-staff/students?search=Maria%20%26%20%25&curriculum_version_id=${CURRICULUM_ID}&adviser_id=${ADVISER_ID}&offset=20`,
    )

    expect(await screen.findByText('Maria Santos')).toBeTruthy()
    await waitFor(() =>
      expect(listStudentRoster).toHaveBeenCalledWith(
        {
          department_id: DEPARTMENT_ID,
          limit: 20,
          offset: 20,
          search: 'Maria & %',
          curriculum_version_id: CURRICULUM_ID,
          adviser_id: ADVISER_ID,
        },
        expect.any(AbortSignal),
      ),
    )
    expect(
      (screen.getByRole('combobox', { name: 'Curriculum' }) as HTMLSelectElement)
        .value,
    ).toBe(CURRICULUM_ID)
    expect(
      (screen.getByRole('combobox', { name: 'Adviser' }) as HTMLSelectElement)
        .value,
    ).toBe(ADVISER_ID)
  })

  it('resets the URL offset when a filter changes', async () => {
    vi.mocked(listStudentRoster).mockImplementation((query) =>
      Promise.resolve({
        ...roster,
        total_count: 45,
        items: query.offset === 20 ? [] : roster.items,
      }),
    )
    renderPortal('/department-staff/students?offset=20')

    await screen.findByText('Showing 0 students on this page; 45 students match these filters')
    fireEvent.change(screen.getByRole('combobox', { name: 'Curriculum' }), {
      target: { value: CURRICULUM_ID },
    })

    await waitFor(() =>
      expect(listStudentRoster).toHaveBeenCalledWith(
        {
          department_id: DEPARTMENT_ID,
          limit: 20,
          offset: 0,
          curriculum_version_id: CURRICULUM_ID,
        },
        expect.any(AbortSignal),
      ),
    )
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).has('offset'),
    ).toBe(false)
  })

  it('encodes special search text in the URL and sends it as plain search text', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue(roster)
    renderPortal('/department-staff/students?offset=20')

    const search = "O'Neil, (A&B)% / 24"
    fireEvent.change(
      await screen.findByRole('searchbox', {
        name: 'Search name or student number',
      }),
      { target: { value: search } },
    )

    await waitFor(() =>
      expect(listStudentRoster).toHaveBeenCalledWith(
        {
          department_id: DEPARTMENT_ID,
          limit: 20,
          offset: 0,
          search,
        },
        expect.any(AbortSignal),
      ),
    )
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).get('search'),
    ).toBe(search)
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).has('offset'),
    ).toBe(false)
  })

  it('paginates using server result counts rather than department totals', async () => {
    const nextStudent: ApiSchema<'StudentRosterItem'> = {
      ...student,
      student_id: '99999999-9999-4999-8999-999999999999',
      student_number: '24-1-09999',
      full_name: 'Next Page Student',
    }
    vi.mocked(listStudentRoster)
      .mockResolvedValueOnce({ ...roster, total_count: 21 })
      .mockResolvedValueOnce({
        ...roster,
        total_count: 21,
        items: [nextStudent],
      })
      .mockResolvedValueOnce({ ...roster, total_count: 21 })
    renderPortal('/department-staff/students')

    expect(await screen.findByText('Maria Santos')).toBeTruthy()
    screen.getByRole('button', { name: 'Next' }).click()

    expect(await screen.findByText('Next Page Student')).toBeTruthy()
    await waitFor(() =>
      expect(listStudentRoster).toHaveBeenCalledWith(
        { department_id: DEPARTMENT_ID, limit: 20, offset: 20 },
        expect.any(AbortSignal),
      ),
    )
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).get('offset'),
    ).toBe('20')

    screen.getByRole('button', { name: 'Previous' }).click()
    expect(await screen.findByText('Maria Santos')).toBeTruthy()
    expect(
      new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      ).has('offset'),
    ).toBe(false)
  })

  it('cancels the previous request and does not render its late result', async () => {
    let resolveSlowRequest:
      | ((value: OperationResponse<'listStudentRoster'>) => void)
      | undefined
    let slowRequestSignal: AbortSignal | undefined
    const nextStudent: ApiSchema<'StudentRosterItem'> = {
      ...student,
      student_id: '99999999-9999-4999-8999-999999999999',
      full_name: 'Current Search Result',
    }
    vi.mocked(listStudentRoster).mockImplementation((query, signal) => {
      if (query.search === 'slow') {
        slowRequestSignal = signal
        return new Promise((resolve) => {
          resolveSlowRequest = resolve
        })
      }
      return Promise.resolve({ ...roster, items: [nextStudent] })
    })
    renderPortal('/department-staff/students?search=slow')

    await waitFor(() => expect(listStudentRoster).toHaveBeenCalledTimes(1))
    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Search name or student number',
      }),
      { target: { value: 'fast' } },
    )

    expect(await screen.findByText('Current Search Result')).toBeTruthy()
    await waitFor(() => expect(slowRequestSignal?.aborted).toBe(true))
    await act(async () => {
      resolveSlowRequest?.({ ...roster, items: [student] })
    })
    expect(screen.queryByText('Maria Santos')).toBeNull()
  })

  it('renders an honest empty state when no roster rows are returned', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue({
      ...roster,
      total_count: 0,
      items: [],
    })
    renderPortal('/department-staff/students')

    expect(
      await screen.findByText('No students match these filters.'),
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
      screen.queryByText('No students match these filters.'),
    ).toBeNull()
  })

  it('reports filter-reference failures instead of showing an empty option list', async () => {
    vi.mocked(listStudentRoster).mockResolvedValue(roster)
    vi.mocked(listStudentFilterOptions).mockRejectedValueOnce(
      new Error('Reference service unavailable'),
    )
    renderPortal('/department-staff/students')

    expect(await screen.findByText('Reference service unavailable')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Curriculum' })).toHaveProperty(
      'disabled',
      true,
    )
    screen.getByRole('button', { name: 'Retry filters' }).click()
    expect(await screen.findByText('BSCS — BSCS 2024-2025 v1')).toBeTruthy()
  })

  it('renders explicit not-found content for unknown child routes', async () => {
    renderPortal('/department-staff/not-a-page')

    expect(
      await screen.findByText('This Department Staff page does not exist.'),
    ).toBeTruthy()
    expect(listStudentRoster).not.toHaveBeenCalled()
  })
})
