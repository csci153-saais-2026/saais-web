import { useQuery } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api";
import { listCatalogPrerequisites } from "@/routes/department-staff/course-catalog/course-catalog.api";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";

export function useCourseCatalogPrerequisites(
  courseId: string,
  enabled: boolean,
) {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;
  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "course-catalog-prerequisites",
      { courseId },
    ),
    queryFn: ({ signal }) => {
      if (!activeScope)
        throw new Error(
          "Prerequisite references require an authenticated Department Staff scope.",
        );
      return listCatalogPrerequisites(courseId, signal);
    },
    enabled: activeScope !== null && enabled && courseId.length > 0,
    retry: false,
  });
}

export function coursePrerequisiteError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "Your account is not permitted to read this course’s prerequisite references.";
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again and retry.";
    if (error.isNetworkError)
      return "Could not reach the prerequisite service. Check your connection and retry.";
  }
  return error instanceof Error
    ? error.message
    : "Prerequisite relationships could not be loaded.";
}
