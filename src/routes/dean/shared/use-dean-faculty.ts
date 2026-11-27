import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getDeanFaculties,
  resolveDeanFaculty,
} from "@/routes/dean/shared/dean-faculty.api";

export function useDeanFaculty(facultyIdOverride?: string | null) {
  const { user, profile, roleScopes, roleAssignments } = useAuth();

  const authFacultyId = useMemo(() => {
    return (
      roleScopes.find((scope) => scope.role === "dean" && scope.facultyId)
        ?.facultyId ??
      roleAssignments.find(
        (assignment) => assignment.role === "dean" && assignment.faculty_id,
      )?.faculty_id ??
      user?.facultyId ??
      profile?.faculty_id ??
      null
    );
  }, [roleScopes, roleAssignments, user, profile]);

  const deanName = user?.fullName ?? profile?.full_name ?? null;
  const effectiveFacultyId = facultyIdOverride ?? authFacultyId;

  const facultiesQuery = useQuery({
    queryKey: ["dean", "faculties"],
    queryFn: ({ signal }) => getDeanFaculties(signal),
  });

  const faculty = useMemo(() => {
    if (!facultiesQuery.data) return null;
    return resolveDeanFaculty(facultiesQuery.data, {
      facultyId: effectiveFacultyId,
      deanName,
    });
  }, [facultiesQuery.data, effectiveFacultyId, deanName]);

  const facultyName = faculty?.name.trim() || null;

  return {
    ...facultiesQuery,
    faculty,
    facultyName,
  };
}
