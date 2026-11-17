import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { listCourseCatalog } from '@/routes/department-staff/course-catalog/course-catalog.api'

export function useCourseCatalog() {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'course-catalog',
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) throw new Error('Course catalog reads require an authorized Department Staff scope.')
      return listCourseCatalog(signal)
    },
    enabled: activeScope !== null,
    retry: false,
  })
}
