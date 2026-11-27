import { fetchAllPages } from "../fetch-all-pages";
import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";

export async function fetchStudentChecklist(
  studentId: string,
): Promise<ApiSchema<"ChecklistSlotResult">[]> {
  return fetchAllPages(
    (limit, offset) =>
      apiClient.GET("/functions/v1/students/{student_id}/checklist", {
        params: { path: { student_id: studentId }, query: { limit, offset } },
      }),
    (slot) => slot.curriculum_term_course_id,
  );
}

export async function recordChecklistExportEvent(
  studentId: string,
  details = "Downloaded the curriculum checklist as PDF",
): Promise<void> {
  const res = await apiClient.POST("/functions/v1/audit/view-event", {
    body: {
      event_type: "pdf_exported",
      student_id: studentId,
      details,
    },
  });
  unwrapApiResult(res);
}
