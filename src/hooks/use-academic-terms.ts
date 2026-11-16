import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { listAcademicTerms } from '@/routes/department-staff/academic-terms/academic-terms.api'

export function useAcademicTerms() {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'academic-terms',
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error('Academic term requests require an authorized department scope.')
      }

      return listAcademicTerms(activeScope.departmentId, signal)
    },
    enabled: activeScope !== null,
    retry: false,
  })
}
