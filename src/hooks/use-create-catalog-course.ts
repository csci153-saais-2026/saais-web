import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { createCatalogCourse, type CatalogCourse } from '@/routes/department-staff/course-catalog/course-catalog.api'
import { courseCreateRequest, type CourseValues } from '@/routes/department-staff/course-catalog/course.schema'
import type { Course } from '@/routes/department-staff/curricula/curricula.api'

export function useCreateCatalogCourse() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (values: CourseValues): Promise<CatalogCourse> => {
      if (scope.status !== 'ready' || !scope.departmentIds.includes(scope.departmentId)) {
        throw new Error('An authorized department is required to create a course.')
      }
      const course = await createCatalogCourse(courseCreateRequest(scope.departmentId, values))
      if (!course?.id || course.department_id !== scope.departmentId) {
        throw new Error('The course creation result could not be confirmed in your authorized department. Refresh the catalog before retrying.')
      }
      return course
    },
    onSuccess: async (course) => {
      if (scope.status !== 'ready') return
      const profileId = scope.profileId
      const departmentId = scope.departmentId
      const courseOptionsKey = staffQueryKeys.resource(profileId, departmentId, 'curriculum-course-options')
      queryClient.setQueryData<Course[]>(courseOptionsKey, current => [
        ...(current ?? []).filter(item => item.id !== course.id), course,
      ])
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.resource(profileId, departmentId, 'course-catalog') }),
        queryClient.invalidateQueries({ queryKey: courseOptionsKey }),
      ])
    },
  })
}

export function courseCreationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'You do not have permission to create courses in this department.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again.'
    if (error.isConflict) return `The course could not be created because the catalog changed or its code is already in use. ${error.message}`
    if (error.isRateLimited) return 'Too many requests. Wait before trying again.'
    if (error.isNetworkError) return 'The course creation result could not be confirmed. Refresh the catalog before submitting again.'
  }
  return error instanceof Error ? error.message : 'The course could not be created.'
}
