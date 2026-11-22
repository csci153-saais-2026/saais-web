import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";

const ADVISER_ASSIGNMENT_SELECT =
  "id,adviser_id,adviser_name,adviser_email,adviser_faculty_name,adviser_consultation_hours,student_id,start_date,end_date,handed_over_to_adviser_id,handed_over_to_name,handover_label,created_at";

export async function fetchStudentAcademicSummary(
  studentId: string,
): Promise<ApiSchema<"AcademicSummary">> {
  const res = await apiClient.GET(
    "/functions/v1/students/{student_id}/academic-summary",
    {
      params: { path: { student_id: studentId } },
    },
  );
  return unwrapApiResult(res);
}

export async function fetchStudentPlanItems(
  studentId: string,
): Promise<ApiSchema<"AdvisingPlanItem">[]> {
  const res = await apiClient.GET("/rest/v1/advising_plan_item", {
    params: {
      query: {
        student_id: postgrestFilter.eq(studentId),
        order: "display_order.asc",
      },
    },
  });
  return unwrapApiResult(res);
}

export async function fetchStudentAdvisingNotes(
  studentId: string,
): Promise<ApiSchema<"AdvisingNote">[]> {
  const res = await apiClient.GET("/rest/v1/advising_note", {
    params: {
      query: {
        student_id: postgrestFilter.eq(studentId),
        order: "created_at.desc",
      },
    },
  });
  return unwrapApiResult(res);
}

export async function fetchStudentAdviserAssignments(
  studentId: string,
): Promise<ApiSchema<"AdviserAssignment">[]> {
  const res = await apiClient.GET("/rest/v1/adviser_assignment", {
    params: {
      query: {
        student_id: postgrestFilter.eq(studentId),
        select: ADVISER_ASSIGNMENT_SELECT,
        order: "start_date.desc",
      },
    },
  });
  return unwrapApiResult(res);
}
