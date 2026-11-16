import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import {
  listStudentAdviserAssignments,
  type AdviserAssignment,
  type BulkAdviserReassignmentRequest,
  bulkReassignAdvisers,
} from '@/routes/department-staff/adviser-assignments/adviser-assignments.api'
import {
  listStudentRoster,
  type StudentRosterFilters,
} from '@/routes/department-staff/students/students.api'
import { useStudentFilterOptions } from '@/routes/department-staff/students/use-students'

export type AdviserAssignmentRosterItem = {
  readonly student: Awaited<ReturnType<typeof listStudentRoster>>['items'][number]
  readonly currentAssignment: AdviserAssignment | null
  readonly previousAssignment: AdviserAssignment | null
}

export type AdviserAssignmentRoster = Omit<
  Awaited<ReturnType<typeof listStudentRoster>>,
  'items'
> & {
  readonly items: readonly AdviserAssignmentRosterItem[]
}

function compareAssignmentDates(
  left: AdviserAssignment,
  right: AdviserAssignment,
): number {
  return (
    (right.end_date ?? '').localeCompare(left.end_date ?? '') ||
    right.start_date.localeCompare(left.start_date) ||
    left.id.localeCompare(right.id)
  )
}

export function useDepartmentAdviserAssignments(filters: StudentRosterFilters) {
  const scope = useStaffScope()

  return useQuery({
    queryKey: staffQueryKeys.resource(
      scope.status === 'ready' ? scope.profileId : '',
      scope.status === 'ready' ? scope.departmentId : '',
      'adviser-assignments',
      filters,
    ),
    queryFn: async ({ signal }) => {
      if (scope.status !== 'ready') {
        throw new Error('Adviser assignments require an authorized department scope.')
      }

      const roster = await listStudentRoster(
        { ...filters, department_id: scope.departmentId },
        signal,
      )
      const assignments = await listStudentAdviserAssignments(
        roster.items.map((student) => student.student_id),
        signal,
      )
      const assignmentsByStudent = new Map<string, AdviserAssignment[]>()
      for (const assignment of assignments) {
        const history = assignmentsByStudent.get(assignment.student_id) ?? []
        history.push(assignment)
        assignmentsByStudent.set(assignment.student_id, history)
      }

      const items = roster.items.map((student) => {
        const history = assignmentsByStudent.get(student.student_id) ?? []
        const currentAssignments = history.filter(
          (assignment) => assignment.end_date == null,
        )
        if (currentAssignments.length > 1) {
          throw new Error(
            `Student ${student.student_number} has multiple active adviser assignments; the roster cannot be prepared safely.`,
          )
        }

        const currentAssignment = currentAssignments[0] ?? null
        const endedAssignments = history.filter(
          (assignment) => assignment.end_date != null,
        )
        if (
          currentAssignment &&
          endedAssignments.some(
            (assignment) =>
              assignment.end_date != null &&
              assignment.end_date > currentAssignment.start_date,
          )
        ) {
          throw new Error(
            `Student ${student.student_number} has overlapping adviser assignments; the roster cannot be prepared safely.`,
          )
        }
        const previousAssignment =
          endedAssignments.sort(compareAssignmentDates)[0] ?? null

        return { student, currentAssignment, previousAssignment }
      })

      return { ...roster, items } satisfies AdviserAssignmentRoster
    },
    enabled: scope.status === 'ready',
    retry: false,
  })
}

export function useAdviserReassignment() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,
    mutationFn: async (body: BulkAdviserReassignmentRequest) => {
      if (scope.status !== 'ready') {
        throw new Error('An authorized department is required to reassign advisers.')
      }
      return bulkReassignAdvisers(body)
    },
    onSuccess: async () => {
      if (scope.status !== 'ready') return
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(scope.profileId, scope.departmentId, 'students'),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(scope.profileId, scope.departmentId, 'adviser-assignments'),
        }),
      ])
    },
  })
}

export function useAdviserAssignmentOptions() {
  return useStudentFilterOptions()
}
