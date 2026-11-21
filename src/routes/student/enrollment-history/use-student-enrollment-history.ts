import { useQuery } from "@tanstack/react-query"
import { fetchStudentEnrollmentHistory } from "./student-enrollment-history.api"

/**
 * Fetches the student's enrollment history and hydrated offering/slot metadata.
 */
export function useStudentEnrollmentHistory(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "enrollment-history"],
    queryFn: () => fetchStudentEnrollmentHistory(studentId),
    enabled: Boolean(studentId),
  })
}
