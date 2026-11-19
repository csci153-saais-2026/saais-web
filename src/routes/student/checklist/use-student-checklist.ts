import { useMutation, useQuery } from "@tanstack/react-query"
import {
  fetchStudentChecklist,
  recordChecklistExportEvent,
} from "./student-checklist.api"

/**
 * Fetches the student's curriculum checklist slots.
 */
export function useStudentChecklist(studentId: string) {
  return useQuery({
    queryKey: ["student", studentId, "checklist"],
    queryFn: () => fetchStudentChecklist(studentId),
    enabled: Boolean(studentId),
  })
}

/**
 * Records a checklist PDF export audit event for the student.
 */
export function useRecordChecklistExport(studentId: string) {
  return useMutation({
    mutationFn: (details?: string) =>
      recordChecklistExportEvent(studentId, details),
  })
}
