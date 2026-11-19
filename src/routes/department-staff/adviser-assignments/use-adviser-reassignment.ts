import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api'
import { staffQueryKeys } from '../shared/staff-query-keys'
import { useStaffScope } from '../shared/use-staff-scope'
import { bulkReassignAdvisers, type BulkAdviserReassignmentRequest } from './adviser-assignments.api'

export function useAdviserReassignment() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()

  async function invalidateAffectedQueries() {
    if (scope.status !== 'ready') return
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: staffQueryKeys.resource(
          scope.profileId,
          scope.departmentId,
          'students',
        ),
      }),
      queryClient.invalidateQueries({
        queryKey: staffQueryKeys.resource(
          scope.profileId,
          scope.departmentId,
          'adviser-assignments',
        ),
      }),
    ])
  }

  return useMutation({
    retry: false,
    mutationFn: async (body: BulkAdviserReassignmentRequest) => {
      if (scope.status !== 'ready') {
        throw new Error('An authorized department is required to reassign advisers.')
      }
      return bulkReassignAdvisers(body)
    },
    onSuccess: invalidateAffectedQueries,
    onError: (error) => {
      const shouldRefresh =
        !(error instanceof ApiClientError) ||
        error.isConflict ||
        error.isNetworkError
      return shouldRefresh ? invalidateAffectedQueries() : undefined
    },
  })
}

