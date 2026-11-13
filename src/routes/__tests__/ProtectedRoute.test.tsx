import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ProtectedRoute } from '../ProtectedRoute'
import AdminRoutes from '@/routes/admin/AdminRoutes'
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
                <Route path="/student" element={<div>Student Portal Content</div>} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['adviser']} />}>
                <Route path="/adviser" element={<div>Adviser Portal Content</div>} />
              </Route>
              <Route
                element={<ProtectedRoute allowedRoles={['department_head']} />}
              >
                <Route
                  path="/department-head"
                  element={<div>Department Head Portal Content</div>}
                />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['dean']} />}>
                <Route path="/dean" element={<div>Dean Portal Content</div>} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/*" element={<AdminRoutes />} />
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

  it.each([
    ['/admin/students', 'Student directory'],
    ['/admin/accounts', 'Accounts and roles'],
    ['/admin/programs', 'Programs'],
    ['/admin/faculties', 'Faculties and departments'],
    ['/admin/settings', 'System settings'],
    ['/admin/audit-log', 'Audit log'],
  ])('allows an Admin to open %s and shows its screen heading', async (path, title) => {
    renderPortalRoutes(
      {
        user: {
          id: 'admin-1',
          email: 'admin@vsu.edu.ph',
          fullName: 'System Admin',
          primaryRole: 'admin',
          roles: ['admin'],
          status: 'active',
        },
        roles: ['admin'],
        activeRole: 'admin',
        isAllowedToEnter: true,
      },
      path,
    )

    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeTruthy()
    expect(screen.getAllByText('System Admin').length).toBeGreaterThan(0)
    expect(screen.getAllByText(title).length).toBeGreaterThan(1)
  })

  it('preserves the existing /admin portal entry', async () => {
    renderPortalRoutes(
      {
        user: {
          id: 'admin-1',
          email: 'admin@vsu.edu.ph',
          fullName: 'System Admin',
          primaryRole: 'admin',
          roles: ['admin'],
          status: 'active',
        },
        roles: ['admin'],
        activeRole: 'admin',
        isAllowedToEnter: true,
      },
      '/admin',
    )

    expect(
      await screen.findByRole('heading', {
        name: 'System Administration Portal',
        level: 1,
      }),
    ).toBeTruthy()
  })

  it('blocks non-Admin users from Admin child routes', () => {
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
      '/admin/students',
    )
    expect(screen.getByText('Adviser Portal Content')).toBeTruthy()
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

  it('blocks Dean-only account from /adviser and routes to /dean', () => {
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
    expect(screen.getByText('Dean Portal Content')).toBeTruthy()
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
    expect(screen.getByText('Adviser Portal Content')).toBeTruthy()
  })

  it('updates the displayed shell role and breadcrumb dynamically when a multi-role user navigates between portals', () => {
    // 1. Multi-role user visits /department-head directly
    const { unmount } = renderPortalRoutes(
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
    expect(screen.getByText('Department Head Portal Content')).toBeTruthy()
    // Shell caption & breadcrumb must reflect Department Head, not stale Dean
    expect(screen.getAllByText('Department Head').length).toBeGreaterThan(0)
    unmount()

    // 2. Same multi-role user visits /adviser directly
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
      '/adviser',
    )
    expect(screen.getByText('Adviser Portal Content')).toBeTruthy()
    expect(screen.getAllByText('Adviser Portal').length).toBeGreaterThan(0)
  })
})
