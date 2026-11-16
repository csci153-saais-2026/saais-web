import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdviserAssignmentsPage from './AdviserAssignmentsPage'

const PROFILE_ID = '11111111-1111-4111-8111-111111111111'
const DEPARTMENT_ID = '22222222-2222-4222-8222-222222222222'
const ADVISER_ID = '88888888-8888-4888-8888-888888888888'
const STUDENT_ID = '33333333-3333-4333-8333-333333333333'

const rosterData = [{
  student_id: STUDENT_ID,
  student_number: '24-1-01798',
  full_name: 'Maria Santos',
  email: 'maria@example.edu.ph',
  status: 'active',
  faculty_id: '44444444-4444-4444-8444-444444444444',
  faculty_name: 'Faculty of Computing',
  department_id: DEPARTMENT_ID,
  department_name: 'Department of Computer Science',
  program_id: '55555555-5555-4555-8555-555555555555',
  program_code: 'BSCS',
  program_name: 'Bachelor of Science in Computer Science',
  curriculum_version_id: '66666666-6666-4666-8666-666666666666',
  curriculum_label: 'BSCS 2024-2025 v1',
  year_level: 3,
  earned_units: 36,
  required_units: 162,
  standing: 'good_standing',
  deficiencies_count: 0,
  open_inc_count: 0,
  open_flags_count: 0,
  adviser_id: ADVISER_ID,
  adviser_name: 'Alex Adviser',
}]

const mutateAsync = vi.fn().mockResolvedValue({
  reassigned_count: 1,
  assignments: [],
})

vi.mock('@/routes/department-staff/shared/use-staff-scope', () => ({
  useStaffScope: () => ({
    status: 'ready',
    departmentId: DEPARTMENT_ID,
    profileId: PROFILE_ID,
    selectedDepartmentId: DEPARTMENT_ID,
    departmentIds: [DEPARTMENT_ID],
    canQuery: true,
    selectDepartment: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-adviser-assignments', () => ({
  useDepartmentAdviserAssignments: () => ({
    data: rosterData,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
    error: null,
  }),
  useAdviserAssignmentOptions: () => ({
    data: {
      advisers: [
        { id: ADVISER_ID, label: 'Alex Adviser' },
        { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', label: 'Dana Delegate' },
      ],
    },
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
    error: null,
  }),
  useAdviserReassignment: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

describe('AdviserAssignmentsPage', () => {
  beforeEach(() => {
    mutateAsync.mockClear()
  })

  it('submits a bulk reassignment for the selected students', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <AdviserAssignmentsPage />
      </QueryClientProvider>,
    )

    const selectStudent = screen.getByLabelText('Select Maria Santos')
    fireEvent.click(selectStudent)
    fireEvent.click(screen.getByRole('button', { name: 'Reassign selected' }))

    fireEvent.change(screen.getByLabelText('Target adviser'), {
      target: { value: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    })
    fireEvent.change(screen.getByLabelText('Effective since'), {
      target: { value: '2026-11-20' },
    })
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Transfer to the new adviser' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Confirm reassignment' }))

    expect(mutateAsync).toHaveBeenCalledWith({
      student_ids: [STUDENT_ID],
      adviser_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      effective_since: '2026-11-20',
      reason: 'Transfer to the new adviser',
    })
  })
})
