import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { listCourseOfferings } from './course-offerings.api'

export function useCourseOfferings(schoolTermId: string | undefined) {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'course-offerings',
      { schoolTermId },
    ),
    enabled: activeScope !== null && schoolTermId !== undefined,
    retry: false,
    queryFn: ({ signal }) => {
      if (!activeScope || !schoolTermId) {
        throw new Error(
          'Course offering requests require an authorized department and school term.',
        )
      }

      return listCourseOfferings(schoolTermId, signal)
    },
  })
}
