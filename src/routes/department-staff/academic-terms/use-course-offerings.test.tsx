import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { StaffScopeContext } from '@/routes/department-staff/shared/use-staff-scope'
import type { Course, CourseOffering, OpenedSubject } from './course-offerings.api'
import {
  useCourseOfferings,
  useCreateCourseOffering,
  useDeleteCourseOffering,
  useUpdateCourseOffering,
} from './use-course-offerings'

const api = vi.hoisted(() => ({
  listCourseOfferings: vi.fn(),
  createCourseOffering: vi.fn(),
  updateCourseOffering: vi.fn(),
  deleteCourseOffering: vi.fn(),
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

function setupWrites(initialTermId: string) {
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
  const hook = renderHook(
    () => ({
      read: useCourseOfferings(initialTermId),
      create: useCreateCourseOffering(),
      update: useUpdateCourseOffering(),
      remove: useDeleteCourseOffering(),
    }),
    { wrapper },
  )

  return { ...hook, queryClient }
}

const course: Course = {
  id: 'course-1',
  department_id: 'department',
  code: 'CS 101',
  title: 'Foundations of Computing',
  units: 3,
  status: 'active',
  repeatable_type: 'none',
}

const offering: CourseOffering = {
  id: 'offering-1',
  school_term_id: 'term-1',
  course_id: course.id,
  section: 'A',
  schedule: 'MWF 09:00-10:00',
  instructor: 'Instructor',
  is_by_request: false,
}

const openedSubject: OpenedSubject = { offering, course }

beforeEach(() => {
  api.listCourseOfferings.mockReset()
  api.createCourseOffering.mockReset()
  api.updateCourseOffering.mockReset()
  api.deleteCourseOffering.mockReset()
})

afterEach(() => {
  cleanup()
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

  it('creates offerings and refreshes the selected term', async () => {
    api.listCourseOfferings.mockResolvedValue([])
    const created: CourseOffering = {
      ...offering,
      section: null,
      schedule: null,
      instructor: null,
    }
    api.createCourseOffering.mockResolvedValue(created)
    const { result } = setupWrites('term-1')

    await waitFor(() => expect(result.current.read.isSuccess).toBe(true))
    await act(async () => {
      await result.current.create.mutateAsync({
        school_term_id: 'term-1',
        course_id: course.id,
        section: null,
        schedule: null,
        instructor: null,
        is_by_request: false,
      })
    })

    await waitFor(() => expect(api.listCourseOfferings).toHaveBeenCalledTimes(2))
    expect(api.createCourseOffering).toHaveBeenCalledWith({
      school_term_id: 'term-1',
      course_id: course.id,
      section: null,
      schedule: null,
      instructor: null,
      is_by_request: false,
    })
  })

  it('updates and deletes only the cached offering, refreshing even after a conflict', async () => {
    api.listCourseOfferings.mockResolvedValue([openedSubject])
    api.updateCourseOffering.mockResolvedValue({
      ...offering,
      section: 'B',
    })
    api.deleteCourseOffering.mockRejectedValue(
      new Error('Academic history protects this offering.'),
    )
    const { result } = setupWrites('term-1')

    await waitFor(() => expect(result.current.read.isSuccess).toBe(true))
    await act(async () => {
      await result.current.update.mutateAsync({
        original: offering,
        body: { section: 'B' },
      })
    })
    await waitFor(() => expect(api.listCourseOfferings).toHaveBeenCalledTimes(2))
    expect(api.updateCourseOffering).toHaveBeenCalledWith('offering-1', {
      section: 'B',
    })

    await expect(
      act(async () => result.current.remove.mutateAsync(offering)),
    ).rejects.toThrow('Academic history protects this offering.')
    await waitFor(() => expect(api.listCourseOfferings).toHaveBeenCalledTimes(3))
    expect(api.deleteCourseOffering).toHaveBeenCalledWith('offering-1')
  })

  it('rejects a stale offering snapshot before sending a write', async () => {
    api.listCourseOfferings.mockResolvedValue([
      {
        ...openedSubject,
        offering: { ...offering, section: 'B' },
      },
    ])
    const { result } = setupWrites('term-1')

    await waitFor(() => expect(result.current.read.isSuccess).toBe(true))
    await expect(
      result.current.update.mutateAsync({
        original: offering,
        body: { section: 'C' },
      }),
    ).rejects.toThrow('This course offering changed or is no longer available.')
    expect(api.updateCourseOffering).not.toHaveBeenCalled()
    await waitFor(() => expect(api.listCourseOfferings).toHaveBeenCalledTimes(2))
  })
})
