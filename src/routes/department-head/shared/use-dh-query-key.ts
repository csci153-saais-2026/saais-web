import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useDepartmentHeadQueryKey(key: readonly string[]) {
  const auth = useContext(AuthContext);
  const { user, activeRole, roleScopes } = auth ?? {
    user: null,
    activeRole: null,
    roleScopes: [],
  };
  const assignedScopes = roleScopes
    .map(
      (scope) =>
        `${scope.role}:${scope.facultyId ?? "*"}:${scope.departmentId ?? "*"}`,
    )
    .sort();
  return [
    ...key,
    user?.id ?? "signed-out",
    activeRole ?? "no-role",
    user?.departmentId ?? "no-department",
    user?.facultyId ?? "no-faculty",
    assignedScopes,
  ] as const;
}
