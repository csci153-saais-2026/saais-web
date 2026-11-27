import { useQuery } from "@tanstack/react-query";
import { staffQueryKeys } from "@/routes/department-staff/shared/staff-query-keys";
import { useStaffScope } from "@/routes/department-staff/shared/use-staff-scope";
import { getStaffDepartmentName } from "@/routes/department-staff/accounts/accounts.api";

export function useStaffDepartmentName() {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "department-name",
    ),
    queryFn: ({ signal }) => {
      if (!activeScope)
        throw new Error(
          "Department lookup requires an authorized Department Staff scope.",
        );
      return getStaffDepartmentName(activeScope.departmentId, signal);
    },
    enabled: activeScope !== null,
    retry: false,
  });
}
