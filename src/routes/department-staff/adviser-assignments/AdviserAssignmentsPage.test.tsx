import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdviserAssignmentsPage from './AdviserAssignmentsPage'

const mocks = vi.hoisted(() => ({
  useDepartmentAdviserAssignments: vi.fn(),
  useAdviserAssignmentOptions: vi.fn(),
}))

vi.mock('@/hooks/use-adviser-assignments', () => ({
  useDepartmentAdviserAssignments: mocks.useDepartmentAdviserAssignments,
  useAdviserAssignmentOptions: mocks.useAdviserAssignmentOptions,
}))

vi.mock('@/routes/department-staff/shared/use-staff-scope', () => ({
  useStaffScope: () => ({
    status: 'ready',
    departmentId: '22222222-2222-4222-8222-222222222222',
    profileId: '11111111-1111-4111-8111-111111111111',
  }),
}))

const firstStudent = {
  student: {
    student_id: '33333333-3333-4333-8333-333333333333',
    student_number: '24-1-01798',
    full_name: 'Maria Santos',
    curriculum_label: 'BSCS 2024-2025 v1',
  },
  currentAssignment: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    adviser_id: '88888888-8888-4888-8888-888888888888',
    adviser_name: 'Alex Adviser',
    student_id: '33333333-3333-4333-8333-333333333333',
    start_date: '2026-04-01',
    end_date: null,
  },
  previousAssignment: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    adviser_id: '77777777-7777-4777-8777-777777777777',
    adviser_name: 'Previous Adviser',
    student_id: '33333333-3333-4333-8333-333333333333',
    start_date: '2025-01-01',
    end_date: '2026-03-31',
  },
}

const secondStudent = {
  ...firstStudent,
  student: {
    ...firstStudent.student,
    student_id: '99999999-9999-4999-8999-999999999999',
    student_number: '24-1-09999',
    full_name: 'Second Student',
  },
  currentAssignment: {
    ...firstStudent.currentAssignment,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    student_id: '99999999-9999-4999-8999-999999999999',
    start_date: '2026-03-01',
  },
  previousAssignment: null,
}

const adviserOptions = {
  curricula: [
    { id: '66666666-6666-4666-8666-666666666666', label: 'BSCS 2024-2025 v1' },
  ],
  advisers: [
    { id: '88888888-8888-4888-8888-888888888888', label: 'Alex Adviser' },
    { id: '77777777-7777-4777-8777-777777777777', label: 'Dana Delegate' },
  ],
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AdviserAssignmentsPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mocks.useDepartmentAdviserAssignments.mockImplementation(
    (filters: { offset: number }) => ({
      data: {
        items: [filters.offset === 0 ? firstStudent : secondStudent],
        total_count: 21,
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
      error: null,
    }),
  )
  mocks.useAdviserAssignmentOptions.mockReturnValue({
    data: adviserOptions,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
    error: null,
  })
})

afterEach(() => cleanup())

describe('AdviserAssignmentsPage', () => {
  it('shows server-backed current and previous adviser history', () => {
    renderPage()

    expect(screen.getByText('Previous Adviser')).toBeTruthy()
    expect(screen.getAllByText('Alex Adviser')).toHaveLength(2)
    expect(
      screen.getByRole('button', { name: 'Prepare reassignment' }),
    ).toHaveProperty('disabled', true)
  })

  it('does not make students without an active adviser assignment selectable', () => {
    mocks.useDepartmentAdviserAssignments.mockImplementation(
      () => ({
        data: {
          items: [{ ...firstStudent, currentAssignment: null }],
          total_count: 1,
        },
        isPending: false,
        isError: false,
        isSuccess: true,
        isFetching: false,
        refetch: vi.fn(),
        error: null,
      }),
    )
    renderPage()

    expect(screen.getAllByLabelText('Select Maria Santos')[0]).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('clears selected students when the visible page changes', () => {
    renderPage()

    fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
    expect(screen.getByText('1 student selected on this page.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Second Student')).toBeTruthy()
    expect(screen.getByText('Showing 21–21 of 21 matching students')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Prepare reassignment' }),
    ).toHaveProperty('disabled', true)
    expect(screen.getAllByLabelText('Select Second Student')[0]).toHaveProperty('checked', false)
  })

  it('clears selected students when a roster filter changes', () => {
    renderPage()

    fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Maria' },
    })

    expect(screen.getByText('Showing 1–1 of 21 matching students')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Prepare reassignment' }),
    ).toHaveProperty('disabled', true)
    expect(screen.getAllByLabelText('Select Maria Santos')[0]).toHaveProperty('checked', false)
  })

  it('prepares a preview without a save or mutation action', () => {
    renderPage()

    fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Prepare reassignment' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Target adviser'), {
      target: { value: '77777777-7777-4777-8777-777777777777' },
    })
    expect(within(dialog).getByText('Reassignment preview')).toBeTruthy()
    expect(
      within(dialog).getByText('Preview only — nothing will be saved in this step.'),
    ).toBeTruthy()
    expect(within(dialog).getByText('Current adviser')).toBeTruthy()
    expect(within(dialog).getAllByText('Alex Adviser')).toHaveLength(2)
    expect(within(dialog).getAllByText('Dana Delegate')).toHaveLength(2)
    expect(within(dialog).getByRole('button', { name: 'Close preview' })).toBeTruthy()
    expect(
      within(dialog).queryByRole('button', { name: /confirm|save|submit/i }),
    ).toBeNull()
  })

  it('rejects whitespace reasons, invalid advisers, and dates before selected assignments', () => {
    renderPage()

    fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Prepare reassignment' }))

    fireEvent.change(screen.getByLabelText('Target adviser'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Effective since'), {
      target: { value: '2026-03-31' },
    })
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: '   ' },
    })

    expect(
      screen.getByText('Select an active adviser in this department.'),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'The effective date cannot be before 1 Apr 2026.',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('Add a non-whitespace reason for this reassignment.'),
    ).toBeTruthy()
  })

  it('closes the preview without submitting changes', () => {
    renderPage()

    fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Prepare reassignment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Prepare reassignment' }),
    ).toHaveProperty('disabled', false)
  })
})
