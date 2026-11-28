import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";
import { fetchRelatedRows } from "@/routes/dean/shared/fetch-all-pages";
import { readAllDepartments } from "@/lib/api/catalog";

export async function getFacultyReport(
  signal?: AbortSignal,
): Promise<ApiSchema<"FacultyReport">> {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/reports/faculty", { signal }),
  );
}

export async function getFacultyDepartments(
  signal?: AbortSignal,
): Promise<ApiSchema<"Department">[]> {
  return readAllDepartments(signal);
}

export async function getDeanAttemptResults(
  studentIds: readonly string[],
  signal?: AbortSignal,
): Promise<ApiSchema<"AttemptResult">[]> {
  return fetchRelatedRows(
    studentIds,
    (student_id, limit, offset) =>
      apiClient.GET("/rest/v1/attempt_result", {
        params: {
          query: {
            select:
              "id,student_id,course_offering_id,recorded_status,midterm_status,midterm_grade,final_grade,completion_grade,effective_status,is_lapsed_inc",
            student_id,
            order: "id.asc",
            limit,
            offset,
          },
        },
        signal,
      }),
    "Attempt results",
  );
}
