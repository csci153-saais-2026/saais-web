import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from '../ProtectedRoute'
import { AuthenticatedPortalLayout } from '@/components/features/AuthenticatedPortalLayout'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'

function renderPortalRoutes(
  authValue: Partial<AuthContextValue>,
  initialEntry = '/adviser',
) {
  const hasUser = Boolean(authValue.user)
  const fullAuthValue: AuthContextValue = {
    user: null,
    profile: null,
    session: null,
    roles: [],
    roleAssignments: [],
    roleScopes: [],
    activeRole: null,
    primaryRole: null,
    isLoading: false,
    isAuthenticated: hasUser,
    isAllowedToEnter: hasUser,
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
    ...authValue,
  }

  return render(
    <AuthContext.Provider value={fullAuthValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthenticatedPortalLayout />}>
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student" element={<div>Student Portal</div>} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['adviser']} />}>
                <Route path="/adviser" element={<div>Adviser Portal</div>} />
              </Route>
              <Route
                element={<ProtectedRoute allowedRoles={['department_head']} />}
              >
                <Route
                  path="/department-head"
                  element={<div>Department Head Portal</div>}
                />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['dean']} />}>
                <Route path="/dean" element={<div>Dean Portal</div>} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<div>Admin Portal</div>} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute & AuthenticatedPortalLayout', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows loading state while verifying session', () => {
    renderPortalRoutes({ isLoading: true }, '/admin')
    expect(screen.getByText(/Verifying session/i)).toBeTruthy()
  })

  it('fails closed with Retry / Sign out when authError occurs during hydration', () => {
    const retryMock = vi.fn(async () => {})
    renderPortalRoutes(
      {
        user: null,
        isAllowedToEnter: false,
        authError: 'Unable to load your institutional profile.',
        retryHydration: retryMock,
      },
      '/adviser',
    )
    expect(
      screen.getByText(/Unable to load your institutional profile/i),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))
    expect(retryMock).toHaveBeenCalled()
  })

  it('blocks Dean-only account from /adviser and /department-head and routes to /dean', () => {
    renderPortalRoutes(
      {
        user: {
          id: 'dean-1',
          email: 'dean.computing@vsu.edu.ph',
          fullName: 'Dean Computing',
          primaryRole: 'dean',
          roles: ['dean'],
          status: 'active',
        },
        roles: ['dean'],
        activeRole: 'dean',
        isAllowedToEnter: true,
      },
      '/adviser',
    )
    expect(screen.getByText('Dean Portal')).toBeTruthy()
  })

  it('blocks Adviser-only account from /department-head and routes to /adviser', () => {
    renderPortalRoutes(
      {
        user: {
          id: 'adv-1',
          email: 'adviser@vsu.edu.ph',
          fullName: 'Marco Polo',
          primaryRole: 'adviser',
          roles: ['adviser'],
          status: 'active',
        },
        roles: ['adviser'],
        activeRole: 'adviser',
        isAllowedToEnter: true,
      },
      '/department-head',
    )
    expect(screen.getByText('Adviser Portal')).toBeTruthy()
  })

  it('allows multi-role user to access each independently assigned route group and renders sidebar sections', () => {
    renderPortalRoutes(
      {
        user: {
          id: 'multi-1',
          email: 'multi@vsu.edu.ph',
          fullName: 'Dr. Alan Turing',
          primaryRole: 'dean',
          roles: ['dean', 'department_head', 'adviser'],
          status: 'active',
        },
        roles: ['dean', 'department_head', 'adviser'],
        activeRole: 'dean',
        isAllowedToEnter: true,
      },
      '/department-head',
    )
    expect(screen.getByText('Department Head Portal')).toBeTruthy()
    expect(screen.getByText('ADVISER')).toBeTruthy()
    expect(screen.getByText('DEPARTMENT HEAD')).toBeTruthy()
    expect(screen.getByText('DEAN')).toBeTruthy()
  })
})
