import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { staffQueryKeys } from '../shared/staff-query-keys'
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
  const view = render(
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

  it('shows resend only for an invited account with eligible server invitation state and serializes that target', async () => {
    let releaseResponse: (() => void) | undefined
    let calls = 0
    const responseGate = new Promise<void>(resolve => { releaseResponse = resolve })
    saaisMockServer.use(http.post('*/functions/v1/accounts/:profile_id/resend-invite', async () => {
      calls += 1
      await responseGate
      return HttpResponse.json({
        success: true,
        message: 'Invitation regenerated and dispatched.',
        profile_id: MOCK_IDS.studentSecondary,
        invitation_status: 'pending',
        invitation_sent_at: '2026-11-17T09:00:00Z',
        invitation_expires_at: '2026-11-24T09:00:00Z',
      })
    }))
    const { queryClient } = renderAccounts()
    const table = await screen.findByRole('table')
    const accountsKey = staffQueryKeys.resource(
      MOCK_PERSONAS.department_staff.profileId,
      MOCK_IDS.deptDcst,
      'accounts',
    )
    queryClient.setQueryData(accountsKey, { cached: true })
    const eligibleRow = await within(table).findByRole('row', { name: /Concoles, Cyril Jade M\./ })
    const resendButton = within(eligibleRow).getByRole('button', { name: 'Resend invitation' })
    expect(within(eligibleRow).getByText('pending')).toBeTruthy()

    const activeRow = await within(table).findByRole('row', { name: new RegExp(MOCK_PERSONAS.student.fullName) })
    expect(within(activeRow).queryByRole('button', { name: 'Resend invitation' })).toBeNull()
    expect(within(activeRow).queryByRole('button', { name: 'Revoke invitation' })).toBeNull()
    fireEvent.click(resendButton)
    await waitFor(() => expect(resendButton.hasAttribute('disabled')).toBe(true))
    fireEvent.click(resendButton)
    expect(calls).toBe(1)

    releaseResponse?.()
    expect((await within(eligibleRow).findByRole('status')).textContent).toContain('Invitation regenerated and dispatched')
    expect(within(eligibleRow).getByRole('button', { name: 'Invitation resent' }).hasAttribute('disabled')).toBe(true)
    await waitFor(() => expect(queryClient.getQueryState(accountsKey)?.isInvalidated).toBe(true))
  })

  it('explains server rate limits and the retry delay for a pending invitation', async () => {
    saaisMockServer.use(http.post('*/functions/v1/accounts/:profile_id/resend-invite', () => HttpResponse.json(
      { code: 'RATE_LIMITED', message: 'Please wait before resending.' },
      { status: 429, headers: { 'Retry-After': '42' } },
    )))
    renderAccounts()
    const table = await screen.findByRole('table')
    const eligibleRow = await within(table).findByRole('row', { name: /Concoles, Cyril Jade M\./ })
    fireEvent.click(within(eligibleRow).getByRole('button', { name: 'Resend invitation' }))

    expect((await within(eligibleRow).findByRole('alert')).textContent).toContain('Try again in 42 seconds.')
  })

  it('names the target and sends no revoke request when confirmation is canceled', async () => {
    let calls = 0
    saaisMockServer.use(http.post('*/functions/v1/accounts/:profile_id/revoke-invite', () => {
      calls += 1
      return HttpResponse.json({})
    }))
    renderAccounts()
    const table = await screen.findByRole('table')
    const targetRow = await within(table).findByRole('row', { name: /Concoles, Cyril Jade M\./ })
    fireEvent.click(within(targetRow).getByRole('button', { name: 'Revoke invitation' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Revoke invitation for Concoles, Cyril Jade M.?' })).toBeTruthy()
    expect(dialog.textContent).toContain(MOCK_PERSONAS.student_secondary.email)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls).toBe(0)
    expect(getMockDatabase().profiles.find(profile => profile.id === MOCK_IDS.studentSecondary)?.invitation_status).toBe('pending')
  })

  it('revokes through the dedicated endpoint, preserves the account and roles, and disables same-target actions while pending', async () => {
    let releaseResponse: (() => void) | undefined
    const responseGate = new Promise<void>(resolve => { releaseResponse = resolve })
    const database = getMockDatabase()
    const profile = database.profiles.find(item => item.id === MOCK_IDS.studentSecondary)!
    const originalRoles = [...(profile.roles ?? [])]
    let revokeCalls = 0
    let destructiveCalls = 0
    saaisMockServer.use(
      http.post('*/functions/v1/accounts/:profile_id/revoke-invite', async () => {
        revokeCalls += 1
        await responseGate
        const updatedProfile = { ...profile, invitation_status: 'revoked' as const, updated_at: '2026-11-17T09:30:00Z' }
        database.profiles[database.profiles.findIndex(item => item.id === MOCK_IDS.studentSecondary)] = updatedProfile
        return HttpResponse.json(updatedProfile)
      }),
      http.delete('*/functions/v1/accounts/:profile_id', () => { destructiveCalls += 1; return HttpResponse.json({}, { status: 500 }) }),
      http.patch('*/functions/v1/accounts/:profile_id', () => { destructiveCalls += 1; return HttpResponse.json({}, { status: 500 }) }),
    )
    renderAccounts()
    const table = await screen.findByRole('table')
    const targetRow = await within(table).findByRole('row', { name: /Concoles, Cyril Jade M\./ })
    fireEvent.click(within(targetRow).getByRole('button', { name: 'Revoke invitation' }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: 'Confirm revocation' })
    fireEvent.click(confirm)

    await waitFor(() => expect(confirm.hasAttribute('disabled')).toBe(true))
    expect(within(targetRow).getByRole('button', { name: 'Resend invitation', hidden: true }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(confirm)
    expect(revokeCalls).toBe(1)
    expect(destructiveCalls).toBe(0)

    releaseResponse?.()
    expect(await within(targetRow).findByText('revoked')).toBeTruthy()
    expect(await within(targetRow).findByText(/Invitation revoked for/)).toBeTruthy()
    await waitFor(() => expect(within(targetRow).queryByRole('button', { name: 'Revoke invitation' })).toBeNull())
    expect(profile.status).toBe('invited')
    expect(profile.roles).toEqual(originalRoles)
    expect(getMockDatabase().profiles.some(item => item.id === MOCK_IDS.studentSecondary)).toBe(true)
  })

  it('shows stale revocation conflicts and refreshes the account status', async () => {
    saaisMockServer.use(http.post('*/functions/v1/accounts/:profile_id/revoke-invite', () => HttpResponse.json(
      { code: 'INVITATION_NOT_REVOCABLE', message: 'This invitation is no longer pending.' },
      { status: 409 },
    )))
    renderAccounts()
    const table = await screen.findByRole('table')
    const targetRow = await within(table).findByRole('row', { name: /Concoles, Cyril Jade M\./ })
    fireEvent.click(within(targetRow).getByRole('button', { name: 'Revoke invitation' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm revocation' }))

    expect((await within(dialog).findByRole('alert')).textContent).toContain('Account status was refreshed')
    expect(getMockDatabase().profiles.find(item => item.id === MOCK_IDS.studentSecondary)?.invitation_status).toBe('pending')
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

  it('sends one reviewed multi-role student request and displays the server result', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    let provisioningCalls = 0
    let submittedBody: unknown
    saaisMockServer.use(http.post('*/functions/v1/auth/invite', async ({ request }) => {
      provisioningCalls += 1
      submittedBody = await request.json()
      return HttpResponse.json({
        success: true,
        message: 'Invitation email dispatched successfully.',
        profile_id: '55555555-5555-4555-8555-555555555555',
        invitation_status: 'pending',
        invitation_sent_at: '2026-11-10T08:00:00Z',
        invitation_expires_at: '2026-11-17T08:00:00Z',
      }, { status: 201 })
    }))
    const { queryClient } = renderAccounts()
    await screen.findByRole('table')
    const scopePrefix = [MOCK_PERSONAS.department_staff.profileId, MOCK_IDS.deptDcst] as const
    const affectedKeys = [
      staffQueryKeys.resource(...scopePrefix, 'accounts'),
      staffQueryKeys.resource(...scopePrefix, 'students'),
      staffQueryKeys.resource(...scopePrefix, 'adviser-assignments'),
    ]
    affectedKeys.forEach(key => queryClient.setQueryData(key, { cached: true }))
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare invitation' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value: 'New Student' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Institutional email' }), { target: { value: 'new.student@vsu.edu.ph' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Canonical student number' }), { target: { value: '26-1-00042' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Additional role Adviser' }))

    fireEvent.click(screen.getByRole('combobox', { name: 'Program' }))
    fireEvent.click(await screen.findByRole('option', { name: /BSCS - Bachelor of Science in Computer Science/ }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Active curriculum version' }))
    fireEvent.click(await screen.findByRole('option', { name: 'BSCS 2024-2025 v1' }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Eligible initial adviser' }))
    fireEvent.click(await screen.findByRole('option', { name: MOCK_PERSONAS.adviser.fullName }))
    fireEvent.click(screen.getByRole('button', { name: 'Review invitation' }))

    const summary = await screen.findByRole('region', { name: 'Invitation review' })
    expect(within(summary).getByText(/new\.student@vsu\.edu\.ph/)).toBeTruthy()
    expect(within(summary).getByText(/Student, Adviser/)).toBeTruthy()
    expect(within(summary).getByText('26-1-00042')).toBeTruthy()
    expect(within(summary).getByText(/BSCS 2024-2025 v1/)).toBeTruthy()
    const sendButton = screen.getByRole('button', { name: 'Send invitation' })
    expect(sendButton.hasAttribute('disabled')).toBe(false)
    fireEvent.click(sendButton)
    fireEvent.click(sendButton)

    expect(await screen.findByText('Invitation email dispatched successfully.')).toBeTruthy()
    expect(provisioningCalls).toBe(1)
    expect(submittedBody).toEqual({
      email: 'new.student@vsu.edu.ph',
      full_name: 'New Student',
      role: 'student',
      student_number: '26-1-00042',
      program_id: MOCK_IDS.programBscs,
      curriculum_version_id: MOCK_IDS.curriculumBscs2024,
      adviser_id: MOCK_IDS.adviserPrimary,
      role_assignments: [{ role: 'adviser', department_id: MOCK_IDS.deptDcst, faculty_id: MOCK_IDS.facultyComputing }],
    })
    expect(screen.getByRole('button', { name: 'Invitation sent' }).hasAttribute('disabled')).toBe(true)
    await waitFor(() => {
      for (const key of affectedKeys) expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true)
    })
  })

  it('shows a real server conflict and permits a deliberate retry without duplicate in-flight requests', async () => {
    let calls = 0
    saaisMockServer.use(http.post('*/functions/v1/auth/invite', () => {
      calls += 1
      return HttpResponse.json({ code: 'DUPLICATE_EMAIL', message: 'An account with this email already exists.' }, { status: 409 })
    }))
    renderAccounts()
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare invitation' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value: 'Duplicate Person' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Institutional email' }), { target: { value: 'duplicate.person@vsu.edu.ph' } })
    fireEvent.click(screen.getByRole('combobox', { name: 'Primary role' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Adviser' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review invitation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('An account with this email already exists.')).toBeTruthy()
    expect(screen.getByText(/server reports a duplicate or conflicting account/)).toBeTruthy()
    expect(calls).toBe(1)
    expect(screen.getByRole('button', { name: 'Send invitation' }).hasAttribute('disabled')).toBe(false)
  })

  it('prevents a self-grant before making a request', async () => {
    let calls = 0
    saaisMockServer.use(http.post('*/functions/v1/auth/invite', () => {
      calls += 1
      return HttpResponse.json({ success: true })
    }))
    renderAccounts()
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare invitation' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Full name' }), { target: { value: 'Staff User' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Institutional email' }), { target: { value: MOCK_PERSONAS.department_staff.email } })
    fireEvent.click(screen.getByRole('button', { name: 'Review invitation' }))

    expect((await screen.findByRole('alert')).textContent).toContain('You cannot grant roles to your own account.')
    expect(screen.getByRole('button', { name: 'Send invitation' }).hasAttribute('disabled')).toBe(true)
    expect(calls).toBe(0)
  })
})
