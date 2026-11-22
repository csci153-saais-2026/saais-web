import { fetchAllPages } from "../fetch-all-pages";
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";

export async function fetchStudentGrades(
  studentId: string,
): Promise<ApiSchema<"TermGrades">[]> {
  return fetchAllPages(
    (limit, offset) =>
      apiClient.GET("/functions/v1/students/{student_id}/grades", {
        params: { path: { student_id: studentId }, query: { limit, offset } },
      }),
    (term) => term.school_term_id,
  );
}

export async function fetchStudentGradeFlags(
  studentId: string,
): Promise<ApiSchema<"GradeFlag">[]> {
  const res = await apiClient.GET("/rest/v1/grade_flag", {
    params: {
      query: {
        student_id: postgrestFilter.eq(studentId),
        order: "created_at.desc",
      },
    },
  });
  return unwrapApiResult(res);
}

export async function createStudentGradeFlag(
  studentId: string,
  body: ApiSchema<"GradeFlagCreateRequest">,
): Promise<ApiSchema<"GradeFlag">> {
  const res = await apiClient.POST(
    "/functions/v1/students/{student_id}/grade-flags",
    {
      params: { path: { student_id: studentId } },
      body,
    },
  );
  return unwrapApiResult(res);
}

export async function recordGradesExportEvent(
  studentId: string,
  details = "Downloaded the grades report as PDF",
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
