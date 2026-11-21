import { useQuery } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import {
  listCourseCatalogPage,
  listCourseCatalogReferences,
  type CourseCatalogFilters,
} from '@/routes/department-staff/course-catalog/course-catalog.api'

export function useCourseCatalogReferences() {
  const scope = useStaffScope()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'course-catalog-references',
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) throw new Error('Course catalog reads require an authorized Department Staff scope.')
      return listCourseCatalogReferences(signal)
    },
    enabled: activeScope !== null,
    retry: false,
  })
}

export function useCourseCatalog(filters: CourseCatalogFilters, searchIsValid = true) {
  const scope = useStaffScope()
  const references = useCourseCatalogReferences()
  const activeScope = scope.status === 'ready' ? scope : null

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? '',
      activeScope?.departmentId ?? '',
      'course-catalog-page',
      {
        search: filters.search,
        status: filters.status,
        facultyId: filters.facultyId,
        departmentId: filters.departmentId,
        page: filters.page,
      },
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) throw new Error('Course catalog reads require an authorized Department Staff scope.')
      return listCourseCatalogPage(filters, references.data!, signal)
    },
    enabled: activeScope !== null && references.isSuccess && searchIsValid,
    retry: false,
  })
}
