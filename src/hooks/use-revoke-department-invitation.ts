import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import { useAuth } from "@/hooks/use-auth";
import { revokeDepartmentAccountInvitation } from "@/routes/department-staff/accounts/accounts.api";

export function useRevokeDepartmentInvitation() {
  const scope = useStaffScope();
  const auth = useAuth();
  const queryClient = useQueryClient();

  async function refreshAccounts() {
    if (scope.status !== "ready") return;
    await queryClient.invalidateQueries({
      queryKey: staffQueryKeys.resource(
        scope.profileId,
        scope.departmentId,
        "accounts",
      ),
    });
  }

  return useMutation({
    retry: false,
    mutationFn: async (profileId: string) => {
      if (scope.status !== "ready" || auth.user?.id !== scope.profileId) {
        throw new Error(
          "An active Department Staff assignment is required to revoke this invitation.",
        );
      }
      if (!profileId || profileId === scope.profileId) {
        throw new Error(
          "A different account in the authorized department is required.",
        );
      }
      return revokeDepartmentAccountInvitation(profileId);
    },
    onSuccess: refreshAccounts,
    onError: (error) => {
      if (
        error instanceof ApiClientError &&
        (error.isConflict || error.isNetworkError)
      ) {
        return refreshAccounts();
      }
      return undefined;
    },
  });
}
