import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import {
  deleteCatalogCourse,
  updateCatalogCourse,
  type CatalogCourse,
} from "@/routes/department-staff/course-catalog/course-catalog.api";

export type CourseCatalogAction = "delete" | "discontinue";

export function useCourseCatalogAction() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async ({
      course,
      action,
    }: {
      course: CatalogCourse;
      action: CourseCatalogAction;
    }) => {
      if (
        scope.status !== "ready" ||
        !scope.departmentIds.includes(course.department_id)
      ) {
        throw new Error(
          "This course is outside your authorized department scope.",
        );
      }
      if (action === "discontinue") {
        if (course.status !== "active")
          throw new Error("Only active courses can be discontinued.");
        const updated = await updateCatalogCourse(course.id, {
          status: "discontinued",
        });
        if (
          !updated?.id ||
          updated.id !== course.id ||
          updated.department_id !== course.department_id ||
          updated.status !== "discontinued"
        ) {
          throw new Error(
            "The discontinuation could not be confirmed. Refresh the catalog before retrying.",
          );
        }
        return;
      }
      await deleteCatalogCourse(course.id);
    },
    onSuccess: async (_result, { course }) => {
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
        // Refresh live versions that reference the course; historical snapshots are immutable.
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

export function courseCatalogActionError(
  error: unknown,
  action: CourseCatalogAction,
): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "You do not have permission to change this course in its department.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again.";
    if (error.isNotFound)
      return "This course is no longer available. Refresh the catalog and try again.";
    if (error.isConflict) {
      if (action === "delete")
        return "This course is protected by curriculum, offering, prerequisite, or attempt history. It was not deleted; discontinue it instead.";
      return `The course changed before it could be discontinued. Refresh the catalog and review it again. ${error.message}`;
    }
    if (error.isRateLimited)
      return "Too many requests. Wait before trying again.";
    if (error.isNetworkError)
      return `The ${action === "delete" ? "deletion" : "discontinuation"} result could not be confirmed. Refresh the catalog before retrying.`;
  }
  return error instanceof Error
    ? error.message
    : `The course could not be ${action === "delete" ? "deleted" : "discontinued"}.`;
}
