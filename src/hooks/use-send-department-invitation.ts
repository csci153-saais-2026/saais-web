import { useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentInviteRoles } from "@/routes/department-staff/accounts/invitation-preview";
import { useAuth } from "@/hooks/use-auth";
import type { ApiSchema } from "@/lib/api";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import { sendDepartmentInvitation } from "@/routes/department-staff/accounts/invitation.api";

export function useSendDepartmentInvitation() {
  const scope = useStaffScope();
  const auth = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: async (payload: ApiSchema<"InviteRequest">) => {
      if (scope.status !== "ready" || auth.user?.id !== scope.profileId) {
        throw new Error(
          "An active Department Staff assignment is required to send this invitation.",
        );
      }

      const assignments = auth.roleAssignments.filter(
        (assignment) =>
          assignment.profile_id === scope.profileId &&
          assignment.role === "department_staff" &&
          assignment.department_id === scope.departmentId,
      );
      const facultyId = assignments[0]?.faculty_id;
      if (
        !facultyId ||
        assignments.some((assignment) => assignment.faculty_id !== facultyId)
      ) {
        throw new Error(
          "A single approved faculty scope is required to send this invitation.",
        );
      }
      if (
        !departmentInviteRoles.includes(
          payload.role as (typeof departmentInviteRoles)[number],
        )
      ) {
        throw new Error(
          "Only approved department invitation roles may be sent.",
        );
      }
      if (
        !auth.roles.includes("admin") &&
        [
          payload.role,
          ...(payload.role_assignments ?? []).map((item) => item.role),
        ].some((role) => role === "admin" || role === "dean")
      ) {
        throw new Error(
          "Admin authority is required to invite Dean or Admin roles.",
        );
      }
      if (
        payload.role === "adviser" &&
        payload.role_assignments?.some(
          (item) => item.role === "admin" || item.role === "dean",
        )
      )
        throw new Error(
          "Adviser invitations cannot include Dean or Admin roles.",
        );
      if (
        payload.email.trim().toLocaleLowerCase() ===
        auth.user.email.trim().toLocaleLowerCase()
      ) {
        throw new Error("You cannot grant roles to your own account.");
      }

      if (
        "department_id" in payload &&
        payload.department_id !== scope.departmentId
      ) {
        throw new Error(
          "The invitation department must match your approved Department Staff scope.",
        );
      }
      if ("faculty_id" in payload && payload.faculty_id !== facultyId) {
        throw new Error(
          "The invitation faculty must match your approved Department Staff scope.",
        );
      }
      if (
        payload.role_assignments?.some(
          (assignment) =>
            assignment.department_id !== scope.departmentId ||
            assignment.faculty_id !== facultyId,
        )
      ) {
        throw new Error(
          "Every additional role must use your approved department and faculty scope.",
        );
      }

      return sendDepartmentInvitation(payload);
    },
    onSuccess: async () => {
      if (scope.status !== "ready") return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            scope.profileId,
            scope.departmentId,
            "accounts",
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            scope.profileId,
            scope.departmentId,
            "students",
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: staffQueryKeys.resource(
            scope.profileId,
            scope.departmentId,
            "adviser-assignments",
          ),
        }),
      ]);
    },
  });
}
