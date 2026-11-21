import { useQuery } from "@tanstack/react-query"
import { fetchStudentProfileData } from "./student-profile.api"

/**
 * Fetches the student's profile, academic assignments, and curriculum history.
 */
export function useStudentProfile(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "profile"],
    queryFn: () => fetchStudentProfileData(studentId),
    enabled: Boolean(studentId),
  })
}
