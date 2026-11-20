import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { http, HttpResponse } from 'msw'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  MOCK_PERSONAS,
  resetMockDatabase,
} from '@/mocks'
import { saaisMockServer } from '@/mocks/node'
import DepartmentStaffPortal from '../DepartmentStaffPortal'
import sample from './import/student-import-sample.csv?raw'
import { loadImportReferences } from './import/student-import'
import { parseStudentFile } from './import/student-import'

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
      departmentId:
        scope.scope_type === 'department' ? scope.scope_id : null,
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

function CurrentLocation() {
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
          <CurrentLocation />
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

describe('Department Staff student directory', () => {
  it('shows department programs and the current academic term from MSW', async () => {
    const db = getMockDatabase()
    const term = db.schoolTerms.find((item) => item.term_type === '1st Semester')!
    term.starts_on = '2000-01-01'
    term.ends_on = '2100-12-31'
    db.programs.push({ ...db.programs[0], id: 'extra-program', department_id: 'another-department', code: 'OTHER' })
    renderPortal('/department-staff/students')
    expect(await screen.findByText('26 enrolled students · BSCS and BSIT · AY 2026 - 2027, 1st Semester')).toBeTruthy()
    expect(screen.queryByText(/OTHER/)).toBeNull()
  })
  it('uses staff-scoped MSW data, searches and resets without clickable rows', async () => {
    renderPortal('/department-staff/students')
    await screen.findByText('Showing 26 of 26 students')
    const name = screen.getByText(MOCK_PERSONAS.student.fullName)
    fireEvent.click(name)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search students' }), { target: { value: 'no matching student' } })
    expect(screen.getByText('No students match these filters.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByText('Showing 26 of 26 students')).toBeTruthy()
  })
  it('requests the assigned department', async () => {
    let departmentId: string | null = null
    saaisMockServer.use(http.get('*/functions/v1/students', ({ request }) => {
      departmentId = new URL(request.url).searchParams.get('department_id')
      return HttpResponse.json({ items: [], total_count: 0 })
    }))
    renderPortal('/department-staff/students')
    await screen.findByText('Showing 0 of 0 students')
    expect(departmentId).toBe(staffPersona.departmentId)
  })
  it('resolves the sample using staff MSW data', async () => {
    const references = await loadImportReferences(staffPersona.departmentId!)
    const result = await parseStudentFile(new File([sample], 'sample.csv'), references)
    expect(result.issues).toEqual([])
    expect(result.rows).toHaveLength(2)
  })
})
