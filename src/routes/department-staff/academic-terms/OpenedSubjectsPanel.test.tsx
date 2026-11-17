import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SchoolTerm } from './academic-terms.api'
import type { OpenedSubject } from './course-offerings.api'
import { OpenedSubjectsPanel } from './OpenedSubjectsPanel'

const mocks = vi.hoisted(() => ({
  useCourseOfferings: vi.fn(),
  useCurricula: vi.fn(),
  useCurriculum: vi.fn(),
  useStaffScope: vi.fn(),
}))

vi.mock('./use-course-offerings', () => ({
  useCourseOfferings: (termId: string) => mocks.useCourseOfferings(termId),
}))

vi.mock('@/hooks/use-curricula', () => ({
  useCurricula: () => mocks.useCurricula(),
  useCurriculum: (versionId: string | undefined) =>
    mocks.useCurriculum(versionId),
}))

vi.mock('@/routes/department-staff/shared/use-staff-scope', () => ({
  useStaffScope: () => mocks.useStaffScope(),
}))

vi.mock('./CourseOfferingDialog', () => ({
  CourseOfferingDialog: ({
    mode,
    onClose,
  }: {
    mode: string
    onClose: () => void
  }) => (
    <div data-testid="course-offering-dialog" data-mode={mode}>
      <button type="button" onClick={onClose}>Close test dialog</button>
    </div>
  ),
}))

const termOne: SchoolTerm = {
  id: 'term-1',
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

const termTwo: SchoolTerm = {
  ...termOne,
  id: 'term-2',
  term_type: '2nd Semester',
  school_year: '2026 - 2027',
  chronological_key: 20262,
}

const offeredSubjects: OpenedSubject[] = [
  {
    offering: {
      id: 'offering-a',
      school_term_id: termOne.id,
      course_id: 'course-a',
      section: 'A',
      schedule: 'MWF 09:00-10:00',
      instructor: 'Instructor A',
      is_by_request: false,
    },
    course: {
      id: 'course-a',
      department_id: 'department-1',
      code: 'CS 101',
      title: 'Foundations of Computing',
      units: 3,
      status: 'active',
      repeatable_type: 'none',
    },
  },
  {
    offering: {
      id: 'offering-a2',
      school_term_id: termOne.id,
      course_id: 'course-a',
      section: 'B',
      schedule: 'TTh 10:00-11:30',
      instructor: 'Instructor B',
      is_by_request: false,
    },
    course: {
      id: 'course-a',
      department_id: 'department-1',
      code: 'CS 101',
      title: 'Foundations of Computing',
      units: 3,
      status: 'active',
      repeatable_type: 'none',
    },
  },
  {
    offering: {
      id: 'offering-b',
      school_term_id: termOne.id,
      course_id: 'course-b',
      section: 'R1',
      schedule: null,
      instructor: null,
      is_by_request: true,
    },
    course: {
      id: 'course-b',
      department_id: 'department-1',
      code: 'CS 202',
      title: 'Algorithms',
      units: 2,
      status: 'discontinued',
      repeatable_type: 'none',
    },
  },
]

const curriculumData = {
  terms: [
    { id: 'curriculum-term-1', curriculum_version_id: 'version-1', year_level: 1, term_sequence: 1 },
    { id: 'curriculum-term-2', curriculum_version_id: 'version-1', year_level: 2, term_sequence: 1 },
  ],
  slots: [
    { id: 'slot-a1', curriculum_term_id: 'curriculum-term-1', course_id: 'course-a', is_elective_slot: false, nominal_units: 3 },
    { id: 'slot-a2', curriculum_term_id: 'curriculum-term-1', course_id: 'course-a', is_elective_slot: false, nominal_units: 3 },
    { id: 'slot-a3', curriculum_term_id: 'curriculum-term-2', course_id: 'course-a', is_elective_slot: false, nominal_units: 3 },
    { id: 'slot-b', curriculum_term_id: 'curriculum-term-2', course_id: 'course-b', is_elective_slot: false, nominal_units: 2 },
    { id: 'slot-flexible', curriculum_term_id: 'curriculum-term-1', course_id: null, is_elective_slot: true, nominal_units: 3 },
  ],
  courses: [],
}

const curriculumVersion = {
  id: 'version-1',
  program_id: 'program-1',
  version_label: '2026',
  effective_start: '2026-08-01',
  effective_end: null,
  delinquency_threshold: 24,
  total_units: 120,
  status: 'active',
}

function success<T>(data: T) {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
  }
}

function courseOfferingsSuccess(data: readonly OpenedSubject[]) {
  return success(data)
}

function resetMocks() {
  mocks.useStaffScope.mockReturnValue({
    status: 'ready',
    departmentIds: ['department-1'],
    selectedDepartmentId: 'department-1',
    departmentId: 'department-1',
    profileId: 'staff-1',
    canQuery: true,
    selectDepartment: vi.fn(),
  })
  mocks.useCourseOfferings.mockImplementation(() =>
    courseOfferingsSuccess(offeredSubjects),
  )
  mocks.useCurricula.mockReturnValue(
    success({
      programs: [
        {
          id: 'program-1',
          department_id: 'department-1',
          code: 'CS',
          name: 'Computer Science',
          nominal_duration: 4,
          status: 'active',
        },
      ],
      versions: [curriculumVersion],
    }),
  )
  mocks.useCurriculum.mockReturnValue(success(curriculumData))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OpenedSubjectsPanel', () => {
  it('opens create and edit actions for offerings in the authorized department', () => {
    resetMocks()
    render(<OpenedSubjectsPanel terms={[termOne]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add offering' }))
    expect(screen.getByTestId('course-offering-dialog').getAttribute('data-mode')).toBe('create')
    fireEvent.click(screen.getByRole('button', { name: 'Close test dialog' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit CS 101 offering section A',
      }),
    )
    expect(screen.getByTestId('course-offering-dialog').getAttribute('data-mode')).toBe('edit')
  })

  it('filters by curriculum year while counting each offered section once', () => {
    resetMocks()
    render(<OpenedSubjectsPanel terms={[termOne]} />)

    expect(screen.getByText('3 offerings · 8 opened units, including by-request offerings.')).toBeTruthy()
    expect(screen.getByText('By request')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Curriculum version'), {
      target: { value: 'version-1' },
    })
    fireEvent.change(screen.getByLabelText('Year standing'), {
      target: { value: '1' },
    })

    expect(screen.getByText('2 offerings · 6 opened units, including by-request offerings.')).toBeTruthy()
    expect(screen.queryByText('By request')).toBeNull()
    expect(mocks.useCurriculum).toHaveBeenLastCalledWith('version-1')
  })

  it('resets curriculum and year filters when switching terms', () => {
    resetMocks()
    mocks.useCourseOfferings.mockImplementation((termId: string) =>
      courseOfferingsSuccess(
        termId === termOne.id
          ? offeredSubjects
          : [offeredSubjects[2]!],
      ),
    )
    const { rerender } = render(
      <OpenedSubjectsPanel terms={[termOne, termTwo]} />,
    )

    fireEvent.change(screen.getByLabelText('Curriculum version'), {
      target: { value: 'version-1' },
    })
    fireEvent.change(screen.getByLabelText('Year standing'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByLabelText('Academic term'), {
      target: { value: termTwo.id },
    })

    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe('')
    expect(screen.getByLabelText('Year standing').hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('1 offering · 2 opened units, including by-request offerings.')).toBeTruthy()

    rerender(<OpenedSubjectsPanel terms={[termTwo]} />)
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe('')
  })

  it('distinguishes a complete empty read from a failed read', () => {
    resetMocks()
    mocks.useCourseOfferings.mockReturnValue(courseOfferingsSuccess([]))
    const { rerender } = render(<OpenedSubjectsPanel terms={[termOne]} />)

    expect(screen.getByText('No course offerings are recorded for this term.')).toBeTruthy()

    mocks.useCourseOfferings.mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      isFetching: false,
      error: new Error('Service unavailable'),
      refetch: vi.fn(),
    })
    rerender(<OpenedSubjectsPanel terms={[termOne]} />)

    expect(screen.getByRole('alert').textContent).toContain('Service unavailable')
    expect(screen.queryByText('No course offerings are recorded for this term.')).toBeNull()
  })
})
