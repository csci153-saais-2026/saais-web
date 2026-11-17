import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { getMockDatabase, loginAsMockPersona, logoutMockPersona, MOCK_IDS, MOCK_PERSONAS, resetMockDatabase } from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import DepartmentStaffPortal from '../DepartmentStaffPortal'

function staffAuth(personaKey: 'department_staff' | 'department_head' = 'department_staff'): AuthContextValue {
  const persona = MOCK_PERSONAS[personaKey]
  const roleAssignments = getMockDatabase().roleAssignments.filter(assignment => assignment.profile_id === persona.profileId)
  return {
    user: {
      id: persona.profileId,
      email: persona.email,
      fullName: persona.fullName,
      primaryRole: persona.primaryRole,
      roles: persona.roles,
      facultyId: persona.facultyId,
      departmentId: persona.departmentId,
    },
    profile: null,
    session: null,
    roles: persona.roles,
    roleAssignments,
    roleScopes: persona.roleScopes.map(scope => ({
      role: scope.role,
      facultyId: scope.scope_type === 'faculty' ? scope.scope_id : null,
      departmentId: scope.scope_type === 'department' ? scope.scope_id : null,
    })),
    activeRole: persona.primaryRole,
    primaryRole: persona.primaryRole,
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: persona.key,
    signInWithPassword: async () => undefined,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    retryHydration: async () => undefined,
    setActiveRole: () => undefined,
    switchMockPersona: () => undefined,
  }
}

function renderAccounts(path = '/department-staff/accounts', personaKey: 'department_staff' | 'department_head' = 'department_staff') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={staffAuth(personaKey)}>
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
    const { accountsMaxOffset, listDepartmentAccounts } = await import('./accounts.api')

    const page = await listDepartmentAccounts(
      { department_id: MOCK_IDS.deptDcst, faculty_id: MOCK_IDS.facultyComputing },
      { search: 'nicolas@example.edu', role: 'adviser', offset: 40 },
    )

    expect(requestedQuery.get('department_id')).toBe(MOCK_IDS.deptDcst)
    expect(requestedQuery.get('faculty_id')).toBe(MOCK_IDS.facultyComputing)
    expect(requestedQuery.get('limit')).toBe('21')
    expect(requestedQuery.get('offset')).toBe('40')
    expect(requestedQuery.get('search')).toBe('nicolas@example.edu')
    expect(requestedQuery.get('role')).toBe('adviser')
    expect(page).toEqual({ accounts: [], hasNext: false })
    await expect(listDepartmentAccounts(
      { department_id: MOCK_IDS.deptDcst, faculty_id: MOCK_IDS.facultyComputing },
      { offset: accountsMaxOffset + 1 },
    )).rejects.toThrow('outside the supported range')
  })

  it('applies the combined search and role filters in the MSW account handler', async () => {
    const { listDepartmentAccounts } = await import('./accounts.api')
    const page = await listDepartmentAccounts(
      { department_id: MOCK_IDS.deptDcst, faculty_id: MOCK_IDS.facultyComputing },
      { search: MOCK_PERSONAS.student.email, role: 'student', offset: 0 },
    )

    expect(page.accounts).toHaveLength(1)
    expect(page.accounts[0]?.profile.email).toBe(MOCK_PERSONAS.student.email)
    expect(page.accounts[0]?.role_assignments?.some(assignment => assignment.role === 'student')).toBe(true)
  })

  it('combines UI search and role filters and resets bounded pagination on changes', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    const requests: URLSearchParams[] = []
    saaisMockServer.use(http.get('*/functions/v1/accounts', ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return HttpResponse.json([])
    }))
    renderAccounts('/department-staff/accounts?offset=40')

    const search = await screen.findByRole('searchbox', { name: 'Search accounts' })
    fireEvent.change(search, { target: { value: 'Ron' } })
    await waitFor(() => expect(requests.at(-1)?.get('search')).toBe('Ron'))
    expect(requests.at(-1)?.get('offset')).toBe('0')

    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Adviser' }))
    await waitFor(() => expect(requests.at(-1)?.get('role')).toBe('adviser'))
    expect(requests.at(-1)?.get('search')).toBe('Ron')
    expect(requests.at(-1)?.get('offset')).toBe('0')
    expect(requests.at(-1)?.get('department_id')).toBe(MOCK_IDS.deptDcst)
    expect(requests.at(-1)?.get('faculty_id')).toBe(MOCK_IDS.facultyComputing)
  })

  it('ignores organization values in the URL and does not broaden the Staff portal guard', async () => {
    let requestedQuery: URLSearchParams | undefined
    saaisMockServer.use(http.get('*/functions/v1/accounts', ({ request }) => {
      requestedQuery = new URL(request.url).searchParams
      return HttpResponse.json([])
    }))
    renderAccounts(`/department-staff/accounts?department=${MOCK_IDS.deptDabe}&faculty=${MOCK_IDS.facultyEngineering}`)

    await screen.findByRole('table')
    expect(requestedQuery?.get('department_id')).toBe(MOCK_IDS.deptDcst)
    expect(requestedQuery?.get('faculty_id')).toBe(MOCK_IDS.facultyComputing)
    expect(screen.queryByRole('combobox', { name: /department|faculty|college/i })).toBeNull()

    cleanup()
    renderAccounts('/department-staff/accounts', 'department_head')
    expect(await screen.findByText('A Department Staff role assignment is required to continue.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Accounts and roles' })).toBeNull()
  })
})
