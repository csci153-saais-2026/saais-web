import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

function renderAccounts(path = '/department-staff/accounts') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth()}>
        <MemoryRouter initialEntries={[path]}>
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

describe('Department Staff accounts directory', () => {
  it('loads the lazy accounts route and renders profile fields and every returned role badge', async () => {
    renderAccounts()

    expect(await screen.findByRole('heading', { name: 'Accounts and roles', level: 1 })).toBeTruthy()
    const row = await screen.findByRole('row', { name: /Tan, Ron Nicolas/ })
    expect(within(row).getByText(MOCK_PERSONAS.dean_dept_head.fullName)).toBeTruthy()
    expect(within(row).getByText(MOCK_PERSONAS.dean_dept_head.email)).toBeTruthy()
    expect(within(row).getByText('Active')).toBeTruthy()
    expect(within(row).getByText('Dean')).toBeTruthy()
    expect(within(row).getByText('Department Head')).toBeTruthy()
    expect(within(row).getByText('Adviser')).toBeTruthy()
  })

  it('uses the assigned department scope and paginates without exposing another department', async () => {
    renderAccounts()

    const table = await screen.findByRole('table')
    expect(await within(table).findByText(MOCK_PERSONAS.student.email)).toBeTruthy()
    expect(within(table).queryByText(MOCK_PERSONAS.student_other_dept.email)).toBeNull()
    expect(screen.getByText('Showing 1-20')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText(/Showing 21/)).toBeTruthy()
    expect(await within(await screen.findByRole('table')).findByText('Sample Student 13')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(false)
  })

  it('shows accessible loading, empty, and server-denied states', async () => {
    let releaseResponse: (() => void) | undefined
    let requestStarted: (() => void) | undefined
    const started = new Promise<void>(resolve => { requestStarted = resolve })
    const responseGate = new Promise<void>(resolve => { releaseResponse = resolve })
    saaisMockServer.use(http.get('*/functions/v1/accounts', async () => {
      requestStarted?.()
      await responseGate
      return HttpResponse.json([])
    }))
    renderAccounts()
    await started
    expect(screen.getByRole('status').textContent).toContain('Loading department accounts')
    releaseResponse?.()
    expect(await screen.findByText('No accounts are listed for this department.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true)

    cleanup()
    saaisMockServer.resetHandlers()
    saaisMockServer.use(http.get('*/functions/v1/accounts', () => HttpResponse.json(
      { code: 'INSUFFICIENT_PRIVILEGE', message: 'Department accounts are not available to this role.' },
      { status: 403 },
    )))
    renderAccounts()
    expect((await screen.findByRole('alert')).textContent).toContain('not permitted to view accounts')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('does not expose Admin-only profile, role, or status mutation controls', async () => {
    let mutationCalls = 0
    saaisMockServer.use(http.patch('*/functions/v1/accounts/:profile_id', () => {
      mutationCalls += 1
      return HttpResponse.json({})
    }))
    renderAccounts()

    await screen.findByRole('table')
    await screen.findByText(MOCK_PERSONAS.student.email)
    expect(screen.queryByRole('button', { name: /edit|update|change role|disable account|enable account/i })).toBeNull()
    expect(screen.queryByRole('form')).toBeNull()
    expect(mutationCalls).toBe(0)
  })

  it('requests account pages with the resolved department and bounded offsets', async () => {
    let requestedQuery = new URLSearchParams()
    saaisMockServer.use(http.get('*/functions/v1/accounts', ({ request }) => {
      requestedQuery = new URL(request.url).searchParams
      return HttpResponse.json([])
    }))
    const { listDepartmentAccounts } = await import('./accounts.api')

    const page = await listDepartmentAccounts({ department_id: MOCK_IDS.deptDcst, offset: 40 })

    expect(requestedQuery.get('department_id')).toBe(MOCK_IDS.deptDcst)
    expect(requestedQuery.get('limit')).toBe('21')
    expect(requestedQuery.get('offset')).toBe('40')
    expect(page).toEqual({ accounts: [], hasNext: false })
  })
})
