import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import LoginPage from '../LoginPage'
import OAuthCallback from '../OAuthCallback'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'

function buildAuthStub(
  overrides: Partial<AuthContextValue>,
): AuthContextValue {
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

describe('LoginPage & OAuthCallback', () => {
  afterEach(() => {
    cleanup()
  })

  it('navigates only after account and roles resolve, never prematurely to /docs', async () => {
    const signInMock = vi.fn(async () => {})
    let currentAuth = buildAuthStub({ signInWithPassword: signInMock })

    const { rerender } = render(
      <AuthContext.Provider value={currentAuth}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/adviser" element={<div>Adviser Portal</div>} />
            <Route path="/docs" element={<div>Docs Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.change(screen.getByLabelText('Institutional email'), {
      target: { value: '23-1-02224@vsu.edu.ph' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Secret12345!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(signInMock).toHaveBeenCalled())
    // Still on login while loading/hydrating (did NOT jump to /docs)
    expect(screen.queryByText('Docs Page')).toBeNull()

    // Now hydration completes with adviser role
    currentAuth = buildAuthStub({
      user: {
        id: 'adv-1',
        email: '23-1-02224@vsu.edu.ph',
        fullName: 'Marco Polo',
        primaryRole: 'adviser',
        roles: ['adviser'],
        status: 'active',
      },
      roles: ['adviser'],
      activeRole: 'adviser',
      isAuthenticated: true,
      isAllowedToEnter: true,
    })

    rerender(
      <AuthContext.Provider value={currentAuth}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/adviser" element={<div>Adviser Portal</div>} />
            <Route path="/docs" element={<div>Docs Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Adviser Portal')).toBeTruthy()
  })

  it('waits during delayed OAuthCallback hydration and redirects once resolved', async () => {
    const delayedAuth = buildAuthStub({ isLoading: true })

    const { rerender } = render(
      <AuthContext.Provider value={delayedAuth}>
        <MemoryRouter initialEntries={['/auth/callback']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/dean" element={<div>Dean Portal</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Still showing loading spinner while hydrating (did NOT prematurely redirect to /login)
    expect(
      screen.getByText(/Completing institutional authentication/i),
    ).toBeTruthy()
    expect(screen.queryByText('Login Page')).toBeNull()

    // Now hydration completes for a Dean account
    rerender(
      <AuthContext.Provider
        value={buildAuthStub({
          isLoading: false,
          user: {
            id: 'dean-1',
            email: 'dean@vsu.edu.ph',
            fullName: 'Dean User',
            primaryRole: 'dean',
            roles: ['dean'],
            status: 'active',
          },
          roles: ['dean'],
          activeRole: 'dean',
          isAuthenticated: true,
          isAllowedToEnter: true,
        })}
      >
        <MemoryRouter initialEntries={['/auth/callback']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/dean" element={<div>Dean Portal</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Dean Portal')).toBeTruthy()
  })

  it('shows recoverable retry UI on OAuthCallback when hydration fails with authError', () => {
    const retryMock = vi.fn(async () => {})
    render(
      <AuthContext.Provider
        value={buildAuthStub({
          isLoading: false,
          authError: 'Network timeout loading profile',
          retryHydration: retryMock,
        })}
      >
        <MemoryRouter initialEntries={['/auth/callback']}>
          <Routes>
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText(/Network timeout loading profile/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))
    expect(retryMock).toHaveBeenCalled()
  })
})
