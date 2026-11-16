import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import AdviserAssignmentsPage from './AdviserAssignmentsPage'

const mocks = vi.hoisted(() => ({
  useDepartmentAdviserAssignments: vi.fn(),
  useAdviserAssignmentOptions: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock('@/hooks/use-adviser-assignments', async () => {
  const React = await import('react')
  return {
    useDepartmentAdviserAssignments: mocks.useDepartmentAdviserAssignments,
    useAdviserAssignmentOptions: mocks.useAdviserAssignmentOptions,
    useAdviserReassignment: () => {
      const [isPending, setIsPending] = React.useState(false)
      return {
        isPending,
        mutateAsync: async (body: unknown) => {
          setIsPending(true)
          try {
            return await mocks.mutateAsync(body)
          } finally {
            setIsPending(false)
          }
        },
      }
    },
  }
})

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

function selectMariaAndOpenDialog() {
  fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
  fireEvent.click(screen.getByRole('button', { name: 'Prepare reassignment' }))
}

function enterValidReason() {
  fireEvent.change(screen.getByLabelText('Reason'), {
    target: { value: 'Transfer to the new adviser' },
  })
}

function chooseDanaAsAdviser() {
  fireEvent.change(screen.getByLabelText('Target adviser'), {
    target: { value: adviserOptions.advisers[1].id },
  })
}

function createApiError(status: number, message: string): ApiClientError {
  return new ApiClientError(
    normalizeApiError({ message }, new Response(null, { status })),
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
  mocks.mutateAsync.mockReset()
  mocks.mutateAsync.mockResolvedValue({
    reassigned_count: 1,
    assignments: [],
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

  it('submits one student in one request, reports the count, and clears selection', async () => {
    renderPage()
    selectMariaAndOpenDialog()
    chooseDanaAsAdviser()
    enterValidReason()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1)
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      student_ids: [firstStudent.student.student_id],
      adviser_id: adviserOptions.advisers[1].id,
      effective_since: expect.any(String),
      reason: 'Transfer to the new adviser',
    })
    expect(await screen.findByText('Successfully reassigned 1 student.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Prepare reassignment' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('submits all visible selected students as one bulk request', async () => {
    mocks.useDepartmentAdviserAssignments.mockImplementation(() => ({
      data: {
        items: [firstStudent, secondStudent],
        total_count: 2,
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      refetch: vi.fn(),
      error: null,
    }))
    mocks.mutateAsync.mockResolvedValue({
      reassigned_count: 2,
      assignments: [],
    })
    renderPage()

    fireEvent.click(screen.getAllByLabelText('Select Maria Santos')[0])
    fireEvent.click(screen.getAllByLabelText('Select Second Student')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Prepare reassignment' }))
    chooseDanaAsAdviser()
    enterValidReason()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1)
    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        student_ids: [
          firstStudent.student.student_id,
          secondStudent.student.student_id,
        ],
        reason: 'Transfer to the new adviser',
      }),
    )
    expect(await screen.findByText('Successfully reassigned 2 students.')).toBeTruthy()
  })

  it('disables repeat confirmation while the request is pending', async () => {
    let resolveMutation:
      | ((value: { reassigned_count: number; assignments: [] }) => void)
      | undefined
    mocks.mutateAsync.mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve
      }),
    )
    renderPage()
    selectMariaAndOpenDialog()
    chooseDanaAsAdviser()
    enterValidReason()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    const pendingButton = await screen.findByRole('button', { name: 'Reassigning…' })
    expect(pendingButton).toHaveProperty('disabled', true)
    fireEvent.click(pendingButton)
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1)

    resolveMutation?.({ reassigned_count: 1, assignments: [] })
    expect(await screen.findByText('Successfully reassigned 1 student.')).toBeTruthy()
  })

  it.each([
    {
      error: createApiError(403, 'Forbidden'),
      message: 'Your account is not permitted to reassign these students. Your inputs have been kept.',
    },
    {
      error: createApiError(409, 'Assignment conflict'),
      message: 'The assignments changed before this request could be applied. Your inputs were kept, and the roster and assignment history were refreshed. Review the current assignments before retrying.',
    },
    {
      error: new ApiClientError(normalizeApiError(new Error('offline'))),
      message: 'The server could not confirm the result because of a network error. Your inputs were kept, and the roster and assignment history were refreshed. Review the current assignments before retrying.',
    },
  ])('preserves inputs and reports request errors', async ({ error, message }) => {
    mocks.mutateAsync.mockRejectedValueOnce(error)
    renderPage()
    selectMariaAndOpenDialog()
    chooseDanaAsAdviser()
    enterValidReason()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.getByLabelText('Reason')).toHaveProperty(
      'value',
      'Transfer to the new adviser',
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByText(/Successfully reassigned/)).toBeNull()
  })

  it('rejects whitespace reasons, invalid advisers, and dates before selected assignments', () => {
    renderPage()
    selectMariaAndOpenDialog()

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
    expect(screen.getByText('The effective date cannot be before 1 Apr 2026.')).toBeTruthy()
    expect(
      screen.getByText('Add a non-whitespace reason for this reassignment.'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm reassignment' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it('cancels without submitting changes and retains the selection', () => {
    renderPage()
    selectMariaAndOpenDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText('1 student selected on this page.')).toBeTruthy()
  })
})
