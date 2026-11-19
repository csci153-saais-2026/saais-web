import { useQuery } from "@tanstack/react-query"
import {
  fetchStudentGradeFlags,
  fetchStudentGrades,
} from "./student-grades.api"

/**
 * Fetches the student's newest-first semester grades.
 */
export function useStudentGrades(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "grades"],
    queryFn: () => fetchStudentGrades(studentId),
    enabled: Boolean(studentId),
  })
}

/**
 * Fetches the student's submitted grade flags.
 */
export function useStudentGradeFlags(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "grade-flags"],
    queryFn: () => fetchStudentGradeFlags(studentId),
    enabled: Boolean(studentId),
  })
}
