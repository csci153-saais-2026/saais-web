import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '../shared/staff-query-keys'
import { useStaffScope } from '../shared/use-staff-scope'
import { listStudentRoster } from './students.api'

export function useStudents() {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'students',
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error('Student roster requests require an authorized scope.')
      }

      return listStudentRoster(
        { department_id: activeScope.departmentId },
        signal,
      )
    },
    enabled: activeScope !== null,
    retry: false,
  })
}
