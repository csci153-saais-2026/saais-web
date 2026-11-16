import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import { useAdviserReassignment } from './use-adviser-assignments'

const mocks = vi.hoisted(() => ({
  bulkReassignAdvisers: vi.fn(),
}))

vi.mock('@/routes/department-staff/adviser-assignments/adviser-assignments.api', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/routes/department-staff/adviser-assignments/adviser-assignments.api')
  >()
  return {
    ...actual,
    bulkReassignAdvisers: mocks.bulkReassignAdvisers,
  }
})

vi.mock('@/routes/department-staff/shared/use-staff-scope', () => ({
  useStaffScope: () => ({
    status: 'ready',
    profileId: '11111111-1111-4111-8111-111111111111',
    departmentId: '22222222-2222-4222-8222-222222222222',
  }),
}))

const PROFILE_ID = '11111111-1111-4111-8111-111111111111'
const DEPARTMENT_ID = '22222222-2222-4222-8222-222222222222'
const request = {
  student_ids: ['33333333-3333-4333-8333-333333333333'],
  adviser_id: '88888888-8888-4888-8888-888888888888',
  effective_since: '2026-11-10',
  reason: 'Transfer to the new adviser',
}

function createMutationHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi
    .spyOn(queryClient, 'invalidateQueries')
    .mockResolvedValue(undefined)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { invalidate, wrapper }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useAdviserReassignment', () => {
  it('invalidates roster and assignment history after success', async () => {
    const { invalidate, wrapper } = createMutationHarness()
    mocks.bulkReassignAdvisers.mockResolvedValue({
      reassigned_count: 1,
      assignments: [],
    })
    const { result } = renderHook(() => useAdviserReassignment(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(request)
    })

    expect(invalidate).toHaveBeenNthCalledWith(1, {
      queryKey: ['staff', PROFILE_ID, DEPARTMENT_ID, 'students', {}],
    })
    expect(invalidate).toHaveBeenNthCalledWith(2, {
      queryKey: ['staff', PROFILE_ID, DEPARTMENT_ID, 'adviser-assignments', {}],
    })
  })

  it('refreshes roster and history after a conflict while preserving the rejection', async () => {
    const { invalidate, wrapper } = createMutationHarness()
    const conflict = new ApiClientError(
      normalizeApiError(
        { message: 'Assignment conflict.' },
        new Response(null, { status: 409 }),
      ),
    )
    mocks.bulkReassignAdvisers.mockRejectedValue(conflict)
    const { result } = renderHook(() => useAdviserReassignment(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toBe(conflict)
    })

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['staff', PROFILE_ID, DEPARTMENT_ID, 'students', {}],
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['staff', PROFILE_ID, DEPARTMENT_ID, 'adviser-assignments', {}],
    })
  })

  it('refreshes affected data when the write result is unknown after a network error', async () => {
    const { invalidate, wrapper } = createMutationHarness()
    const networkError = new ApiClientError(
      normalizeApiError(new Error('offline')),
    )
    mocks.bulkReassignAdvisers.mockRejectedValue(networkError)
    const { result } = renderHook(() => useAdviserReassignment(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toBe(networkError)
    })

    expect(invalidate).toHaveBeenCalledTimes(2)
  })
})
