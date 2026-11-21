import { useQuery } from "@tanstack/react-query"
import {
  fetchStudentAcademicSummary,
  fetchStudentAdviserAssignments,
  fetchStudentAdvisingNotes,
  fetchStudentPlanItems,
} from "./student-dashboard.api"

export function useStudentAcademicSummary(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "academic-summary"],
    queryFn: () => fetchStudentAcademicSummary(studentId),
    enabled: Boolean(studentId),
  })
}

export function useStudentPlanItems(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "plan-items"],
    queryFn: () => fetchStudentPlanItems(studentId),
    enabled: Boolean(studentId),
  })
}

export function useStudentAdvisingNotes(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "advising-notes"],
    queryFn: () => fetchStudentAdvisingNotes(studentId),
    enabled: Boolean(studentId),
  })
}

export function useStudentAdviserAssignments(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "adviser-assignments"],
    queryFn: () => fetchStudentAdviserAssignments(studentId),
    enabled: Boolean(studentId),
  })
}

/**
 * Combined React Query hook for the Student Dashboard screen.
 */
export function useStudentDashboard(studentId: string) {
  const summaryQuery = useStudentAcademicSummary(studentId)
  const planItemsQuery = useStudentPlanItems(studentId)
  const notesQuery = useStudentAdvisingNotes(studentId)
  const adviserAssignmentsQuery = useStudentAdviserAssignments(studentId)

  const isPending =
    summaryQuery.isPending ||
    planItemsQuery.isPending ||
    notesQuery.isPending ||
    adviserAssignmentsQuery.isPending

  const isError =
    summaryQuery.isError ||
    planItemsQuery.isError ||
    notesQuery.isError ||
    adviserAssignmentsQuery.isError

  const data =
    summaryQuery.data &&
    planItemsQuery.data &&
    notesQuery.data &&
    adviserAssignmentsQuery.data
      ? {
          summary: summaryQuery.data,
          planItems: planItemsQuery.data,
          notes: notesQuery.data,
          adviserAssignments: adviserAssignmentsQuery.data,
        }
      : undefined

  async function refetch() {
    await Promise.all([
      summaryQuery.refetch(),
      planItemsQuery.refetch(),
      notesQuery.refetch(),
      adviserAssignmentsQuery.refetch(),
    ])
  }

  return {
    data,
    isPending,
    isError,
    error:
      summaryQuery.error ??
      planItemsQuery.error ??
      notesQuery.error ??
      adviserAssignmentsQuery.error ??
      null,
    refetch,
    summaryQuery,
    planItemsQuery,
    notesQuery,
    adviserAssignmentsQuery,
  }
}
