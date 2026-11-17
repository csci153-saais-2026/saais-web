import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
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
        <MemoryRouter initialEntries={['/department-staff/adviser-assignments']}>
          <Routes>
            <Route path="/department-staff/*" element={<DepartmentStaffPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

async function waitForAssignments() {
  await screen.findByText('Student–adviser assignments')
  await screen.findByText(MOCK_PERSONAS.student.fullName)
  await screen.findByText(MOCK_PERSONAS.student_secondary.fullName)
}

function selectAssignedStudent() {
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: `Select ${MOCK_PERSONAS.student.fullName}`,
    }),
  )
}

function openReassignmentDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Reassign selected' }))
}

function enterReason(reason = 'Transfer to the new adviser') {
  fireEvent.change(screen.getByLabelText('Reason'), {
    target: { value: reason },
  })
}

function chooseSecondaryAdviser() {
  fireEvent.change(screen.getByLabelText('Target adviser'), {
    target: { value: MOCK_IDS.adviserSecondary },
  })
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

describe('Department Staff adviser assignments', () => {
  it('renders the prototype layout with existing records from MSW and staff persona', async () => {
    renderPage()
    await waitForAssignments()

    expect(
      screen.getByRole('heading', { name: 'Adviser assignments', level: 1 }),
    ).toBeTruthy()
    expect(
      await screen.findByText('Assign and reassign advisers to students in the Department of Computer Science and Technology.'),
    ).toBeTruthy()
    expect(
      screen.getByText(/Reassignment takes effect on the selected date/),
    ).toBeTruthy()
    expect(screen.getByText('Student–adviser assignments')).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Search students' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Curriculum' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Adviser' })).toBeTruthy()
    expect(screen.getAllByText(MOCK_PERSONAS.adviser.fullName)).toHaveLength(2)
    expect(screen.getByText('01 Aug 2024')).toBeTruthy()
    expect(screen.getAllByText('BSCS 2024')).toHaveLength(2)

    expect(
      screen.getByRole('checkbox', {
        name: `Select ${MOCK_PERSONAS.student_secondary.fullName}`,
      }),
    ).toHaveProperty('disabled', true)
    expect(screen.getByText('0 students selected')).toBeTruthy()
    expect(screen.getByText(/Showing 1–2 of 2 students/)).toBeTruthy()
  })

  it('filters the existing roster by search and adviser through MSW', async () => {
    renderPage()
    await waitForAssignments()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search students' }), {
      target: { value: MOCK_PERSONAS.student_secondary.fullName },
    })
    expect(
      await screen.findByText(MOCK_PERSONAS.student_secondary.fullName),
    ).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByText(MOCK_PERSONAS.student.fullName)).toBeNull(),
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search students' }), {
      target: { value: '' },
    })
    await screen.findByText(MOCK_PERSONAS.student.fullName)
    fireEvent.change(screen.getByRole('combobox', { name: 'Adviser' }), {
      target: { value: MOCK_IDS.adviserPrimary },
    })
    expect(await screen.findByText(MOCK_PERSONAS.student.fullName)).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByText(MOCK_PERSONAS.student_secondary.fullName)).toBeNull(),
    )
  })

  it('selects only students with current assignments and submits one real mock reassignment', async () => {
    renderPage()
    await waitForAssignments()
    selectAssignedStudent()

    expect(screen.getByText('1 student selected')).toBeTruthy()
    openReassignmentDialog()
    chooseSecondaryAdviser()
    enterReason()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    expect(
      await screen.findByText('Successfully reassigned 1 student.'),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => {
      const activeAssignment = getMockDatabase().adviserAssignments.find(
        (assignment) =>
          assignment.student_id === MOCK_IDS.studentPrimary &&
          assignment.end_date === null,
      )
      expect(activeAssignment?.adviser_id).toBe(MOCK_IDS.adviserSecondary)
    })
  })

  it('validates date, eligible adviser, and a non-empty reason without writing', async () => {
    renderPage()
    await waitForAssignments()
    selectAssignedStudent()
    openReassignmentDialog()

    fireEvent.change(screen.getByLabelText('Target adviser'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Effective since'), {
      target: { value: '2024-07-31' },
    })
    enterReason('   ')

    expect(
      screen.getByText('Select an active adviser in this department.'),
    ).toBeTruthy()
    expect(
      screen.getByText('The effective date cannot be before 1 Aug 2024.'),
    ).toBeTruthy()
    expect(screen.getByText('Add a non-whitespace reason for this reassignment.')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Confirm reassignment' }),
    ).toHaveProperty('disabled', true)
    expect(
      getMockDatabase().adviserAssignments.filter(
        (assignment) => assignment.student_id === MOCK_IDS.studentPrimary,
      ),
    ).toHaveLength(1)
  })

  it('keeps the dialog inputs when the MSW handler reports a conflict', async () => {
    saaisMockServer.use(
      http.post('*/functions/v1/adviser-assignments/bulk-reassign', () =>
        HttpResponse.json(
          { code: 'CONFLICT', message: 'Assignment conflict' },
          { status: 409 },
        ),
      ),
    )
    renderPage()
    await waitForAssignments()
    selectAssignedStudent()
    openReassignmentDialog()
    chooseSecondaryAdviser()
    enterReason()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    expect(
      await screen.findByText(
        'The assignments changed before this request could be applied. Your inputs were kept, and the roster and assignment history were refreshed. Review the current assignments before retrying.',
      ),
    ).toBeTruthy()
    expect(screen.getByLabelText('Reason')).toHaveProperty(
      'value',
      'Transfer to the new adviser',
    )
    expect(screen.getByLabelText('Target adviser')).toHaveProperty(
      'value',
      MOCK_IDS.adviserSecondary,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('shows a retryable roster error from MSW without inventing records', async () => {
    saaisMockServer.use(
      http.get('*/functions/v1/students', () =>
        HttpResponse.json(
          { code: 'SERVICE_UNAVAILABLE', message: 'Roster temporarily unavailable' },
          { status: 503 },
        ),
      ),
    )
    renderPage()

    expect(
      await screen.findByText(/Roster temporarily unavailable/),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Retry' }),
    ).toBeTruthy()
  })
})
