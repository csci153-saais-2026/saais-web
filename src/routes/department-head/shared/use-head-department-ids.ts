import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

/** Departments the signed-in user heads, from their role assignments. */
export function useHeadDepartmentIds(): string[] {
  const scopes = useContext(AuthContext)?.roleScopes ?? [];
  return [
    ...new Set(
      scopes.flatMap((scope) =>
        scope.role === "department_head" && scope.departmentId
          ? [scope.departmentId]
          : [],
      ),
    ),
  ].sort();
}
