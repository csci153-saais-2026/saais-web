import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import * as React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from '../ProtectedRoute'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'

function renderWithAuth(
  _ui: React.ReactElement,
  authValue: Partial<AuthContextValue>,
  initialEntry = '/protected',
) {
  const hasUser = Boolean(authValue.user)
  const fullAuthValue: AuthContextValue = {
    user: null,
    profile: null,
    session: null,
    roles: [],
    roleAssignments: [],
    activeRole: null,
    primaryRole: null,
    isLoading: false,
    isAuthenticated: hasUser,
    isAllowedToEnter: hasUser,
    entryBlockedReason: null,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: null,
    signInWithPassword: async () => {},
    signInWithGoogle: async () => {},
    signOut: async () => {},
    setActiveRole: () => {},
    switchMockPersona: () => {},
    ...authValue,
  }

  return render(
    <AuthContext.Provider value={fullAuthValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/student" element={<div>Student Portal</div>} />
          <Route path="/admin" element={<div>Admin Portal</div>} />
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/protected" element={<div>Secret Admin Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows loading state while verifying session', () => {
    renderWithAuth(<div>Content</div>, { isLoading: true })
    expect(screen.getByText(/Verifying session/i)).toBeTruthy()
  })

  it('redirects to /login when unauthenticated', () => {
    renderWithAuth(<div>Content</div>, { user: null, isAllowedToEnter: false })
    expect(screen.getByText('Login Page')).toBeTruthy()
  })

  it('redirects to /login when account is not allowed to enter (invited or disabled)', () => {
    renderWithAuth(<div>Content</div>, {
      user: {
        id: 'invited-1',
        email: 'invited@vsu.edu.ph',
        fullName: 'Pending User',
        primaryRole: 'student',
        roles: ['student'],
        status: 'invited',
        facultyId: null,
        departmentId: null,
        authProvider: 'password',
      },
      isAuthenticated: true,
      isAllowedToEnter: false,
      entryBlockedReason: 'Your institutional account has not been activated yet.',
    })
    expect(screen.getByText('Login Page')).toBeTruthy()
  })

  it('redirects to authorized portal when role does not match', () => {
    renderWithAuth(<div>Content</div>, {
      user: {
        id: 'user-1',
        email: 'student@vsu.edu.ph',
        fullName: 'Juan',
        primaryRole: 'student',
        roles: ['student'],
        status: 'active',
        facultyId: null,
        departmentId: null,
        authProvider: 'password',
      },
      roles: ['student'],
      activeRole: 'student',
      isAllowedToEnter: true,
    })
    expect(screen.getByText('Student Portal')).toBeTruthy()
  })

  it('renders protected child route when role matches', () => {
    renderWithAuth(<div>Content</div>, {
      user: {
        id: 'admin-1',
        email: 'admin@vsu.edu.ph',
        fullName: 'Jake',
        primaryRole: 'admin',
        roles: ['admin'],
        status: 'active',
        facultyId: null,
        departmentId: null,
        authProvider: 'password',
      },
      roles: ['admin'],
      activeRole: 'admin',
      isAllowedToEnter: true,
    })
    expect(screen.getByText('Secret Admin Dashboard')).toBeTruthy()
  })
})
