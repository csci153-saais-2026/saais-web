import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { listStudentRoster } from '@/routes/department-staff/students/students.api'
import { useStudentFilterOptions } from '@/routes/department-staff/students/use-students'
import {
  bulkReassignAdvisers,
  type BulkAdviserReassignmentRequest,
} from '@/routes/department-staff/adviser-assignments/adviser-assignments.api'

export function useDepartmentAdviserAssignments() {
  const scope = useStaffScope()

  return useQuery({
    queryKey: staffQueryKeys.resource(
      scope.status === 'ready' ? scope.profileId : '',
      scope.status === 'ready' ? scope.departmentId : '',
      'adviser-assignments',
    ),
    queryFn: async ({ signal }) => {
      if (scope.status !== 'ready') {
        throw new Error('Adviser assignments require an authorized department scope.')
      }

      const result = await listStudentRoster(
        { department_id: scope.departmentId, limit: 1000, offset: 0 },
        signal,
      )
      return result.items
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
