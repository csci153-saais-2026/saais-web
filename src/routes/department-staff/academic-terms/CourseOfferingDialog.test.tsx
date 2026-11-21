import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import type { Course, CourseOffering } from './course-offerings.api'
import type { SchoolTerm } from './academic-terms.api'
import { courseOfferingFormSchema } from './course-offering.schema'
import { CourseOfferingDialog } from './CourseOfferingDialog'

const mocks = vi.hoisted(() => ({
  create: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  update: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  remove: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  courseOptions: {
    data: [] as Course[],
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
}))

vi.mock('./use-course-offerings', () => ({
  useCreateCourseOffering: () => mocks.create,
  useUpdateCourseOffering: () => mocks.update,
  useDeleteCourseOffering: () => mocks.remove,
}))

vi.mock('@/hooks/use-curricula', () => ({
  useCurriculumCourses: () => mocks.courseOptions,
}))

const term: SchoolTerm = {
  id: '00000000-0000-4000-8000-000000000001',
  start_year: 2026,
  end_year: 2027,
  term_type: '1st Semester',
  school_year: '2026 - 2027',
  is_locked: false,
  override_flag: false,
  starts_on: '2026-08-01',
  ends_on: '2026-12-20',
  encoding_deadline: '2027-01-15',
  default_inc_deadline: '2027-12-20',
  chronological_key: 20261,
}

const activeCourse: Course = {
  id: '00000000-0000-4000-8000-000000000002',
  department_id: 'department-1',
  code: 'CS 101',
  title: 'Foundations of Computing',
  units: 3,
  status: 'active',
  repeatable_type: 'none',
}

const discontinuedCourse: Course = {
  ...activeCourse,
  id: '00000000-0000-4000-8000-000000000003',
  code: 'CS 090',
  title: 'Legacy Required Course',
  status: 'discontinued',
}

const offering: CourseOffering = {
  id: '00000000-0000-4000-8000-000000000004',
  school_term_id: term.id,
  course_id: activeCourse.id,
  section: 'A',
  schedule: 'MWF 09:00-10:00',
  instructor: 'Instructor',
  is_by_request: false,
}

function renderDialog({
  mode = 'create',
  currentOffering,
  currentCourse,
  discontinuedRequiredCourses = [],
}: {
  mode?: 'create' | 'edit' | 'delete'
  currentOffering?: CourseOffering
  currentCourse?: Course
  discontinuedRequiredCourses?: readonly Course[]
} = {}) {
  const onClose = vi.fn()
  const onComplete = vi.fn()
  render(
    <CourseOfferingDialog
      mode={mode}
      term={term}
      offering={currentOffering}
      course={currentCourse}
      discontinuedRequiredCourses={discontinuedRequiredCourses}
      onClose={onClose}
      onComplete={onComplete}
    />,
  )
  return { onClose, onComplete }
}

function resetMocks() {
  mocks.create.mutateAsync.mockReset()
  mocks.create.isPending = false
  mocks.create.isError = false
  mocks.create.error = null
  mocks.update.mutateAsync.mockReset()
  mocks.update.isPending = false
  mocks.update.isError = false
  mocks.update.error = null
  mocks.remove.mutateAsync.mockReset()
  mocks.remove.isPending = false
  mocks.remove.isError = false
  mocks.remove.error = null
  mocks.courseOptions.data = [activeCourse]
  mocks.courseOptions.isPending = false
  mocks.courseOptions.isError = false
  mocks.courseOptions.isSuccess = true
  mocks.courseOptions.isFetching = false
  mocks.courseOptions.error = null
  mocks.courseOptions.refetch.mockReset()
}

function apiConflict(message: string): ApiClientError {
  return new ApiClientError(
    normalizeApiError({ code: 'CONFLICT', message }, new Response(null, { status: 409 })),
  )
}

beforeEach(resetMocks)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CourseOfferingDialog', () => {
  it('creates an offering with trimmed fields and no invented defaults', async () => {
    const { onComplete } = renderDialog()

    fireEvent.change(screen.getByLabelText('Course'), {
      target: { value: activeCourse.id },
    })
    fireEvent.change(screen.getByLabelText('Section'), {
      target: { value: '  A  ' },
    })
    fireEvent.change(screen.getByLabelText('Instructor'), {
      target: { value: '  Instructor  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add offering' }))

    await waitFor(() => expect(mocks.create.mutateAsync).toHaveBeenCalledOnce())
    expect(mocks.create.mutateAsync).toHaveBeenCalledWith({
      school_term_id: term.id,
      course_id: activeCourse.id,
      section: 'A',
      schedule: null,
      instructor: 'Instructor',
      is_by_request: false,
    })
    expect(onComplete).toHaveBeenCalledWith('created')
  })

  it('forces discontinued required courses through the by-request flow', async () => {
    const { onComplete } = renderDialog({
      discontinuedRequiredCourses: [discontinuedCourse],
    })

    fireEvent.change(screen.getByLabelText('Course'), {
      target: { value: discontinuedCourse.id },
    })

    const byRequest = screen.getByLabelText('By-request offering') as HTMLInputElement
    expect(byRequest.checked).toBe(true)
    expect(byRequest.disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Add offering' }))
    await waitFor(() => expect(mocks.create.mutateAsync).toHaveBeenCalledOnce())
    expect(mocks.create.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        course_id: discontinuedCourse.id,
        is_by_request: true,
      }),
    )
    expect(onComplete).toHaveBeenCalledWith('created')
  })

  it('rejects invalid fields and requires an explicit course before submission', async () => {
    expect(
      courseOfferingFormSchema.safeParse({
        course_id: activeCourse.id,
        section: 'S'.repeat(65),
        schedule: '',
        instructor: '',
        is_by_request: false,
      }).success,
    ).toBe(false)

    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Add offering' }))
    expect(await screen.findByText('Choose a course.')).toBeTruthy()
    expect(mocks.create.mutateAsync).not.toHaveBeenCalled()
  })

  it('updates only editable fields and prevents duplicate submissions', async () => {
    let resolveMutation: (() => void) | undefined
    mocks.update.mutateAsync.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveMutation = resolve
      }),
    )
    const { onComplete } = renderDialog({
      mode: 'edit',
      currentOffering: offering,
      currentCourse: activeCourse,
    })

    fireEvent.change(screen.getByLabelText('Section'), {
      target: { value: 'B' },
    })
    const save = screen.getByRole('button', { name: 'Save changes' })
    fireEvent.click(save)
    fireEvent.click(save)

    await waitFor(() => expect(mocks.update.mutateAsync).toHaveBeenCalledOnce())
    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
      original: offering,
      body: {
        section: 'B',
        schedule: 'MWF 09:00-10:00',
        instructor: 'Instructor',
        is_by_request: false,
      },
    })
    resolveMutation?.()
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('updated'))
  })

  it('confirms removal and keeps a history conflict visible', async () => {
    mocks.remove.isError = true
    mocks.remove.error = apiConflict('Academic history protects this offering.')
    mocks.remove.mutateAsync.mockRejectedValue(mocks.remove.error)
    const { onComplete } = renderDialog({
      mode: 'delete',
      currentOffering: offering,
      currentCourse: activeCourse,
    })

    expect(screen.getByRole('alert').textContent).toContain(
      'academic history, or dependent records may protect this offering',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }))
    await waitFor(() => expect(mocks.remove.mutateAsync).toHaveBeenCalledWith(offering))
    expect(onComplete).not.toHaveBeenCalled()
  })
})
