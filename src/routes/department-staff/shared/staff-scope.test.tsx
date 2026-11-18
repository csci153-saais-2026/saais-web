import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiSchema } from '@/lib/api'
import { AuthContext, type AuthContextValue } from '@/context/auth-context'
import { staffQueryKeys } from './staff-query-keys'
import {
  useStaffScope,
} from './use-staff-scope'
import { StaffScopeProvider } from './staff-scope-provider'

afterEach(cleanup)

const STAFF_ROLE: ApiSchema<'RoleAssignment'>['role'] = 'department_staff'

function assignment(
  profileId: string,
  departmentId: string | null,
  index = 0,
): ApiSchema<'RoleAssignment'> {
  return {
    id: `${profileId}-role-${index}`,
    profile_id: profileId,
    role: STAFF_ROLE,
    faculty_id: null,
    department_id: departmentId,
    created_at: '2026-11-16T00:00:00Z',
  }
}

function staffAuth(
  profileId: string,
  departmentIds: readonly (string | null)[],
): AuthContextValue {
  return {
    user: {
      id: profileId,
      email: `${profileId}@vsu.edu.ph`,
      fullName: 'Department Staff',
      primaryRole: STAFF_ROLE,
      roles: [STAFF_ROLE],
    },
    profile: null,
    session: null,
    roles: [STAFF_ROLE],
    roleAssignments: departmentIds.map((id, index) =>
      assignment(profileId, id, index),
    ),
    roleScopes: departmentIds.map((departmentId) => ({
      role: STAFF_ROLE,
      facultyId: null,
      departmentId,
    })),
    activeRole: STAFF_ROLE,
    primaryRole: STAFF_ROLE,
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: true,
    isMockMode: true,
    activePersonaKey: 'department_staff',
    signInWithPassword: async () => undefined,
    signInWithGoogle: async () => undefined,
    signOut: async () => undefined,
    retryHydration: async () => undefined,
    setActiveRole: () => undefined,
    switchMockPersona: () => undefined,
  }
}

function createHarness(initialAuth: AuthContextValue) {
  let authValue = initialAuth
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <StaffScopeProvider>{children}</StaffScopeProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  )

  return {
    queryClient,
    wrapper,
    setAuth(value: AuthContextValue) {
      authValue = value
    },
  }
}

describe('department staff scope', () => {
  it('keeps queries disabled while auth is loading or department scope is absent', async () => {
    const loadingHarness = createHarness({
      ...staffAuth('staff-a', ['dept-a']),
      isLoading: true,
    })
    const loading = renderHook(() => useStaffScope(), {
      wrapper: loadingHarness.wrapper,
    })
    expect(loading.result.current.status).toBe('loading')
    expect(loading.result.current.canQuery).toBe(false)
    loading.unmount()

    const missingScopeHarness = createHarness(staffAuth('staff-a', [null]))
    const missingScope = renderHook(() => useStaffScope(), {
      wrapper: missingScopeHarness.wrapper,
    })
    expect(missingScope.result.current.status).toBe('unavailable')
    if (missingScope.result.current.status === 'unavailable') {
      expect(missingScope.result.current.reason).toBe(
        'department-not-assigned',
      )
    }
    expect(missingScope.result.current.canQuery).toBe(false)
  })

  it('ignores a Department Staff assignment belonging to another profile', () => {
    const auth = staffAuth('staff-a', ['dept-a'])
    const harness = createHarness({
      ...auth,
      roleAssignments: [assignment('staff-b', 'dept-a')],
    })
    const { result } = renderHook(() => useStaffScope(), {
      wrapper: harness.wrapper,
    })

    expect(result.current.status).toBe('unavailable')
    expect(result.current.canQuery).toBe(false)
  })

  it('uses the single authorized Department Staff assignment without a profile fallback', async () => {
    const harness = createHarness(staffAuth('staff-a', ['dept-a']))
    const { result } = renderHook(() => useStaffScope(), {
      wrapper: harness.wrapper,
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current).toMatchObject({
      status: 'ready',
      profileId: 'staff-a',
      departmentId: 'dept-a',
      canQuery: true,
    })
  })

  it('requires an explicit choice among multiple authorized departments', async () => {
    const harness = createHarness(
      staffAuth('staff-a', ['dept-a', 'dept-b']),
    )
    const { result } = renderHook(() => useStaffScope(), {
      wrapper: harness.wrapper,
    })

    expect(result.current.status).toBe('select-department')
    expect(result.current.canQuery).toBe(false)
    act(() => result.current.selectDepartment('dept-unauthorized'))
    expect(result.current.status).toBe('select-department')

    act(() => result.current.selectDepartment('dept-b'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.status === 'ready' && result.current.departmentId).toBe(
      'dept-b',
    )
  })

  it('clears Staff query data on identity changes and preserves unrelated queries', async () => {
    const harness = createHarness(staffAuth('staff-a', ['dept-a']))
    const { result, rerender } = renderHook(() => useStaffScope(), {
      wrapper: harness.wrapper,
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const oldStaffKey = staffQueryKeys.resource(
      'staff-a',
      'dept-a',
      'students',
      { search: 'maria' },
    )
    const unrelatedKey = ['student', 'profile-a'] as const
    harness.queryClient.setQueryData(oldStaffKey, ['private staff data'])
    harness.queryClient.setQueryData(unrelatedKey, ['unrelated data'])

    const activeStaffKey = staffQueryKeys.resource(
      'staff-a',
      'dept-a',
      'assignments',
    )
    let requestSignal: AbortSignal | undefined
    void harness.queryClient
      .fetchQuery({
        queryKey: activeStaffKey,
        queryFn: ({ signal }) =>
          new Promise<never>((_resolve, reject) => {
            requestSignal = signal
            signal.addEventListener(
              'abort',
              () => reject(new Error('Staff query cancelled')),
              { once: true },
            )
          }),
      })
      .catch(() => undefined)
    await waitFor(() =>
      expect(
        harness.queryClient.getQueryState(activeStaffKey)?.fetchStatus,
      ).toBe('fetching'),
    )

    act(() => {
      harness.setAuth(staffAuth('staff-b', ['dept-b']))
      rerender()
    })

    expect(result.current.canQuery).toBe(false)
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(requestSignal?.aborted).toBe(true)
    expect(harness.queryClient.getQueryData(oldStaffKey)).toBeUndefined()
    expect(harness.queryClient.getQueryData(unrelatedKey)).toEqual([
      'unrelated data',
    ])
  })

  it('clears scoped data before enabling requests for a newly selected department', async () => {
    const harness = createHarness(
      staffAuth('staff-a', ['dept-a', 'dept-b']),
    )
    const { result } = renderHook(() => useStaffScope(), {
      wrapper: harness.wrapper,
    })

    act(() => result.current.selectDepartment('dept-a'))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const oldStaffKey = staffQueryKeys.resource(
      'staff-a',
      'dept-a',
      'students',
      { page: 0 },
    )
    harness.queryClient.setQueryData(oldStaffKey, ['dept-a data'])

    act(() => result.current.selectDepartment('dept-b'))
    expect(result.current.canQuery).toBe(false)
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.status === 'ready' && result.current.departmentId).toBe(
      'dept-b',
    )
    expect(harness.queryClient.getQueryData(oldStaffKey)).toBeUndefined()
  })

  it('keys Staff data by identity, department, resource, and filters', () => {
    expect(
      staffQueryKeys.resource('staff-a', 'dept-a', 'students', {
        search: 'maria',
      }),
    ).toEqual(['staff', 'staff-a', 'dept-a', 'students', { search: 'maria' }])
    expect(
      staffQueryKeys.resource('staff-a', 'dept-b', 'students', {
        search: 'maria',
      }),
    ).not.toEqual(
      staffQueryKeys.resource('staff-b', 'dept-a', 'students', {
        search: 'maria',
      }),
    )
  })
})
