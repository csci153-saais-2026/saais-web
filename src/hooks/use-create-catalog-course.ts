import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import {
  createCatalogCourse,
  updateCatalogCourse,
  type CatalogCourse,
} from "@/routes/department-staff/course-catalog/course-catalog.api";
import {
  courseCreateRequest,
  courseUpdateRequest,
  type CourseValues,
  type EditableCourseValues,
} from "@/routes/department-staff/course-catalog/course.schema";
import type { Course } from "@/routes/department-staff/curricula/curricula.api";

export function useCreateCatalogCourse() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (values: CourseValues): Promise<CatalogCourse> => {
      if (
        scope.status !== "ready" ||
        !scope.departmentIds.includes(scope.departmentId)
      ) {
        throw new Error(
          "An authorized department is required to create a course.",
        );
      }
      const course = await createCatalogCourse(
        courseCreateRequest(scope.departmentId, values),
      );
      if (!course?.id || course.department_id !== scope.departmentId) {
        throw new Error(
          "The course creation result could not be confirmed in your authorized department. Refresh the catalog before retrying.",
        );
      }
      return course;
    },
    onSuccess: async (course) => {
      if (scope.status !== "ready") return;
      const profileId = scope.profileId;
      const departmentId = scope.departmentId;
      const courseOptionsKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curriculum-course-options",
      );
      queryClient.setQueryData<Course[]>(courseOptionsKey, (current) => [
        ...(current ?? []).filter((item) => item.id !== course.id),
        course,
      ]);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "course-catalog-page",
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "course-catalog-references",
          ),
        }),
        queryClient.invalidateQueries({ queryKey: courseOptionsKey }),
      ]);
    },
  });
}

export function useUpdateCatalogCourse() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async ({
      course,
      values,
    }: {
      course: CatalogCourse;
      values: EditableCourseValues;
    }): Promise<CatalogCourse> => {
      if (
        scope.status !== "ready" ||
        !scope.departmentIds.includes(course.department_id)
      ) {
        throw new Error(
          "This course is outside your authorized department scope.",
        );
      }
      const updated = await updateCatalogCourse(
        course.id,
        courseUpdateRequest(values),
      );
      if (
        !updated?.id ||
        updated.id !== course.id ||
        updated.department_id !== course.department_id
      ) {
        throw new Error(
          "The course update result could not be confirmed in its authorized department. Refresh the catalog before retrying.",
        );
      }
      return updated;
    },
    onSuccess: async (_course, { course }) => {
      if (scope.status !== "ready") return;
      const { profileId } = scope;
      const departmentId = course.department_id;
      const departmentPrefix = staffQueryKeys.scope(profileId, departmentId);
      const curriculaKey = staffQueryKeys.resource(
        profileId,
        departmentId,
        "curricula",
      );
      const curriculumIndex = queryClient.getQueryData<{
        versions?: Array<{ id: string; status: string }>;
      }>(curriculaKey);
      const editableVersionIds = new Set(
        (curriculumIndex?.versions ?? [])
          .filter(
            (version) =>
              version.status === "active" || version.status === "draft",
          )
          .map((version) => version.id),
      );
      const overviewPrefix = [...departmentPrefix, "curriculum-overview"];
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "course-catalog-page",
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "course-catalog-references",
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            profileId,
            departmentId,
            "curriculum-course-options",
          ),
        }),
        // Refresh impacted live versions; do not refetch historical snapshots.
        queryClient.invalidateQueries({
          queryKey: overviewPrefix,
          predicate: (query) => {
            const versionId = (
              query.queryKey[4] as { versionId?: unknown } | undefined
            )?.versionId;
            const overview = query.state.data as
              { slots?: Array<{ course_id?: string | null }> } | undefined;
            return (
              typeof versionId === "string" &&
              editableVersionIds.has(versionId) &&
              overview?.slots?.some((slot) => slot.course_id === course.id) ===
                true
            );
          },
        }),
      ]);
    },
  });
}

export function courseCreationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "You do not have permission to create courses in this department.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isConflict)
      return `The course could not be created because the catalog changed or its code is already in use. ${error.message}`;
    if (error.isRateLimited)
      return "Too many requests. Wait before trying again.";
    if (error.isNetworkError)
      return "The course creation result could not be confirmed. Refresh the catalog before submitting again.";
  }
  return error instanceof Error
    ? error.message
    : "The course could not be created.";
}

export function courseUpdateError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "You do not have permission to edit this course in its department.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isNotFound)
      return "This course is no longer available. Refresh the catalog before trying again.";
    if (error.isConflict) {
      if (
        ["23505", "UNIQUE_VIOLATION", "DUPLICATE_COURSE_CODE"].includes(
          error.code.toUpperCase(),
        )
      ) {
        return `A course with this code already exists in the department. ${error.message}`;
      }
      return `This course changed since it was loaded. Refresh the catalog, review the current details, and try again. ${error.message}`;
    }
    if (error.isRateLimited)
      return "Too many requests. Wait before trying again.";
    if (error.isNetworkError)
      return "The update result could not be confirmed. Refresh the catalog before submitting again.";
  }
  return error instanceof Error
    ? error.message
    : "The course could not be updated.";
}
