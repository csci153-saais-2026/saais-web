import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { StaffScopeContext } from '@/routes/department-staff/shared/use-staff-scope'
import { useCourseOfferings } from './use-course-offerings'

const api = vi.hoisted(() => ({
  listCourseOfferings: vi.fn(),
}))

vi.mock('./course-offerings.api', () => api)

const scope = {
  status: 'ready' as const,
  departmentIds: ['department'],
  selectedDepartmentId: 'department',
  departmentId: 'department',
  profileId: 'staff',
  canQuery: true as const,
  selectDepartment: vi.fn(),
}

function setup(initialTermId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <StaffScopeContext.Provider value={scope}>
        {children}
      </StaffScopeContext.Provider>
    </QueryClientProvider>
  )
  const hook = renderHook(({ termId }: { termId: string }) => useCourseOfferings(termId), {
    initialProps: { termId: initialTermId },
    wrapper,
  })

  return { ...hook, queryClient }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useCourseOfferings', () => {
  it('uses the staff scope and cancels the previous term read when the term changes', async () => {
    api.listCourseOfferings.mockImplementation(
      (termId: string, signal?: AbortSignal) =>
        termId === 'term-1'
          ? new Promise((_resolve, reject) => {
              signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError')),
              )
            })
          : Promise.resolve([]),
    )
    const { result, rerender, queryClient } = setup('term-1')

    await waitFor(() => expect(api.listCourseOfferings).toHaveBeenCalledOnce())
    const firstSignal = api.listCourseOfferings.mock.calls[0]?.[1] as AbortSignal
    expect(firstSignal).toBeInstanceOf(AbortSignal)
    expect(result.current.isPending).toBe(true)

    rerender({ termId: 'term-2' })
    await waitFor(() => expect(api.listCourseOfferings).toHaveBeenCalledTimes(2))
    expect(firstSignal.aborted).toBe(true)

    expect(
      queryClient.getQueryCache().find({
        queryKey: staffQueryKeys.resource(
          'staff',
          'department',
          'course-offerings',
          { schoolTermId: 'term-2' },
        ),
      }),
    ).toBeDefined()
  })
})
