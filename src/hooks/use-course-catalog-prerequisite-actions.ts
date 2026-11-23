import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClientError, type ApiSchema } from "@/lib/api";
import {
  createCatalogPrerequisite,
  deleteCatalogPrerequisite,
  listDepartmentPrerequisiteCandidates,
} from "@/routes/department-staff/course-catalog/course-catalog.api";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";

export function useDepartmentPrerequisiteCandidates(
  departmentId: string,
  enabled: boolean,
) {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;
  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "course-catalog-prerequisite-candidates",
      { departmentId },
    ),
    queryFn: ({ signal }) => {
      if (!activeScope || activeScope.departmentId !== departmentId) {
        throw new Error(
          "Prerequisite candidates require the authorized administering department.",
        );
      }
      return listDepartmentPrerequisiteCandidates(departmentId, signal);
    },
    enabled:
      activeScope !== null &&
      activeScope.departmentId === departmentId &&
      enabled,
    retry: false,
  });
}

type PrerequisiteMutationScope = { departmentId: string; profileId: string };

function usePrerequisiteMutationScope() {
  const scope = useStaffScope();
  const queryClient = useQueryClient();

  function assertDepartment(departmentId: string): PrerequisiteMutationScope {
    if (scope.status !== "ready" || scope.departmentId !== departmentId) {
      throw new Error(
        "Prerequisite changes are limited to your authorized administering department.",
      );
    }
    return { departmentId: scope.departmentId, profileId: scope.profileId };
  }

  async function refreshCatalog(scopeKey: PrerequisiteMutationScope) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: staffQueryKeys.resource(
          scopeKey.profileId,
          scopeKey.departmentId,
          "course-catalog-prerequisites",
        ),
      }),
      queryClient.invalidateQueries({
        queryKey: staffQueryKeys.resource(
          scopeKey.profileId,
          scopeKey.departmentId,
          "course-catalog-page",
        ),
      }),
    ]);
  }

  return { assertDepartment, refreshCatalog };
}

export function useCreateCoursePrerequisite() {
  const { assertDepartment, refreshCatalog } = usePrerequisiteMutationScope();
  return useMutation({
    mutationFn: async (input: {
      departmentId: string;
      body: ApiSchema<"PrerequisiteInsert">;
    }) => {
      assertDepartment(input.departmentId);
      return createCatalogPrerequisite(input.body);
    },
    onSuccess: (_created, input) =>
      refreshCatalog(assertDepartment(input.departmentId)),
  });
}

export function useDeleteCoursePrerequisite() {
  const { assertDepartment, refreshCatalog } = usePrerequisiteMutationScope();
  return useMutation({
    mutationFn: async (input: { departmentId: string; id: string }) => {
      assertDepartment(input.departmentId);
      await deleteCatalogPrerequisite(input.id);
    },
    onSuccess: (_deleted, input) =>
      refreshCatalog(assertDepartment(input.departmentId)),
  });
}

export function coursePrerequisiteMutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden)
      return "Your account is not permitted to change prerequisite relationships for this department.";
    if (error.isConflict)
      return (
        error.message ||
        "The server rejected this change because it conflicts with an academic rule or existing relationship."
      );
    if (error.isAuthError)
      return "Your session could not be verified. Sign in again and retry.";
    if (error.isNetworkError)
      return "Could not reach the prerequisite service. Check your connection and retry.";
  }
  return error instanceof Error
    ? error.message
    : "The prerequisite relationship could not be changed.";
}
