import { useQuery } from "@tanstack/react-query";
import { staffQueryKeys } from "../shared/staff-query-keys";
import { useStaffScope } from "../shared/use-staff-scope";
import {
  listStudentFilterOptions,
  listStudentRoster,
  type StudentRosterFilters,
} from "./students.api";

export function useStudents(filters: StudentRosterFilters) {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "students",
      filters,
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error("Student roster requests require an authorized scope.");
      }

      return listStudentRoster(
        { ...filters, department_id: activeScope.departmentId },
        signal,
      );
    },
    enabled: activeScope !== null,
    retry: false,
  });
}

export function useStudentFilterOptions() {
  const scope = useStaffScope();
  const activeScope = scope.status === "ready" ? scope : null;

  return useQuery({
    queryKey: staffQueryKeys.resource(
      activeScope?.profileId ?? "",
      activeScope?.departmentId ?? "",
      "student-filter-options",
    ),
    queryFn: ({ signal }) => {
      if (!activeScope) {
        throw new Error(
          "Student filter reference reads require an authorized scope.",
        );
      }

      return listStudentFilterOptions(activeScope.departmentId, signal);
    },
    enabled: activeScope !== null,
    retry: false,
  });
}
