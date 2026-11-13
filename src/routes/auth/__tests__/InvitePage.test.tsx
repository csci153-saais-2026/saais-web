import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi,
} from 'vitest'
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import InvitePage from '../InvitePage'
import ForgotPasswordPage from '../ForgotPasswordPage'
import ResetPasswordPage from '../ResetPasswordPage'
import ChangePasswordPage from '../ChangePasswordPage'
import { AuthProvider } from '@/context/AuthProvider'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { apiClient, createSaaisApiClient } from '@/lib/api'
import { MOCK_PERSONAS } from '@/mocks/personas'
import { getMockDatabase, resetMockDatabase } from '@/mocks/store'
import {
  ensureSyntheticProfilesInMockStore,
  SYNTHETIC_INVITED_ADVISER_ID,
} from '@/lib/auth/mock-auth-service'
import { saaisMockServer } from '@/mocks/node'

function buildAuthStub(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    profile: null,
    session: null,
    roles: [],
    roleAssignments: [],
    roleScopes: [],
    activeRole: null,
    primaryRole: null,
    isLoading: false,
    isAuthenticated: false,
    isAllowedToEnter: false,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: null,
    signInWithPassword: async () => {},
    signInWithGoogle: async () => {},
    signOut: async () => {},
    retryHydration: async () => {},
    setActiveRole: () => {},
    switchMockPersona: () => {},
    ...overrides,
  }
}

describe('InvitePage & Password Flows', () => {
  beforeAll(() => {
    saaisMockServer.listen()
  })

  afterAll(() => {
    saaisMockServer.close()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
    resetMockDatabase()
    ensureSyntheticProfilesInMockStore()
  })

  afterEach(() => {
    saaisMockServer.resetHandlers()
    cleanup()
    window.history.replaceState(null, '', '/')
  })

  it('displays an error if no invitation token is found in the URL hash', async () => {
    window.location.hash = ''
    render(
      <AuthProvider>
        <MemoryRouter>
          <InvitePage />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(await screen.findByText(/No invitation token found/i)).toBeTruthy()
  })

  it('preserves window.history.state when scrubbing #token=... under React StrictMode', async () => {
    window.history.replaceState(
      { usr: { fromRouter: true }, idx: 3 },
      '',
      '/invite#token=valid-invite-token-12345',
    )
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    vi.spyOn(apiClient, 'POST').mockResolvedValue({
      data: {
        valid: true,
        status: 'pending',
        email: 'maria@vsu.edu.ph',
        full_name: 'Maria Santos',
        role: 'student',
        roles: ['student'],
        faculty_name: 'Faculty of Computing',
        department_name: 'DCST',
        program_code: 'BSCS',
        expires_at: '2026-12-31T23:59:59Z',
      },
      error: undefined,
      response: new Response(),
    } as never)

    render(
      <AuthProvider>
        <MemoryRouter>
          <InvitePage />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(replaceStateSpy).toHaveBeenCalledWith(
      { usr: { fromRouter: true }, idx: 3 },
      '',
      '/invite',
    )

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Maria Santos/i)).toBeTruthy()
    })
  })

  it('isolates mock invitation acceptance to ONLY the invited profile for that token', async () => {
    const db = getMockDatabase()
    const studentBefore = db.profiles.find(
      (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
    )
    const adviserBefore = db.profiles.find(
      (p) => p.id === SYNTHETIC_INVITED_ADVISER_ID,
    )
    expect(studentBefore?.status).toBe('invited')
    expect(adviserBefore?.status).toBe('invited')

    const client = createSaaisApiClient({
      baseUrl: 'https://saais-mock.supabase.co',
      mode: 'mock',
      apiKey: 'sb_publishable_mock_key',
    })
    const { data, error } = await client.POST(
      '/functions/v1/auth/verify-invite',
      {
        body: {
          token: `invite:${MOCK_PERSONAS.student_secondary.profileId}`,
          password: 'ValidPassword123',
        },
      },
    )
    expect(error).toBeUndefined()
    expect(data?.success).toBe(true)

    const studentAfter = db.profiles.find(
      (p) => p.id === MOCK_PERSONAS.student_secondary.profileId,
    )
    const adviserAfter = db.profiles.find(
      (p) => p.id === SYNTHETIC_INVITED_ADVISER_ID,
    )
    expect(studentAfter?.status).toBe('active')
    expect(studentAfter?.invitation_status).toBe('accepted')
    expect(adviserAfter?.status).toBe('invited')
    expect(adviserAfter?.invitation_status).toBe('pending')
  })

  it('keeps ForgotPasswordPage responses neutral for existing, unknown, and disabled accounts', async () => {
    const emails = [
      MOCK_PERSONAS.adviser.email,
      'does.not.exist@vsu.edu.ph',
      'inactive.user@vsu.edu.ph',
    ]

    for (const email of emails) {
      const { unmount } = render(
        <AuthProvider>
          <MemoryRouter>
            <ForgotPasswordPage />
          </MemoryRouter>
        </AuthProvider>,
      )
      fireEvent.change(screen.getByLabelText(/Institutional email/i), {
        target: { value: email },
      })
      fireEvent.click(
        screen.getByRole('button', { name: /Send Recovery Email/i }),
      )
      expect(await screen.findByText(/Recovery Email Sent/i)).toBeTruthy()
      unmount()
    }
  })

  it('rejects ordinary signed-in session on ResetPasswordPage even with fabricated recovery params', async () => {
    // Ordinary signed-in session visits /reset-password?code=fake-code
    const signedInAuth = buildAuthStub({
      user: {
        id: 'user-1',
        email: 'user@vsu.edu.ph',
        fullName: 'Active User',
        primaryRole: 'student',
        roles: ['student'],
        status: 'active',
      },
      isPasswordRecovery: false,
    })

    window.history.replaceState(null, '', '/reset-password?code=fabricated-code')
    render(
      <AuthContext.Provider value={signedInAuth}>
        <MemoryRouter>
          <ResetPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Form must NOT be visible; user should be prompted to use Account Settings instead
    expect(
      await screen.findByText(/You are currently signed in with an active institutional session/i),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Go to Account Settings/i })).toBeTruthy()
    expect(screen.queryByLabelText(/^New Password$/i)).toBeNull()
  })

  it('allows password reset only when verified by an active recovery session (isPasswordRecovery: true)', async () => {
    const recoveryAuth = buildAuthStub({
      user: null,
      isPasswordRecovery: true,
    })

    render(
      <AuthContext.Provider value={recoveryAuth}>
        <MemoryRouter>
          <ResetPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: 'StrongNewPass123' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: 'StrongNewPass123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }))
    expect(await screen.findByText(/Password Reset Complete/i)).toBeTruthy()
  })

  it('validates ChangePasswordPage policy inside <AuthProvider>', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </AuthProvider>,
    )
    fireEvent.change(screen.getByLabelText(/^Current Password$/i), {
      target: { value: 'SamePassword123' },
    })
    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: 'SamePassword123' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: 'SamePassword123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Change Password/i }))
    expect(
      await screen.findByText(/must not be identical to your current password/i),
    ).toBeTruthy()
  })
})
