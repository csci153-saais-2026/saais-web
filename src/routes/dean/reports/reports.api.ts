import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"

export async function getFacultyReport(
  signal?: AbortSignal,
): Promise<ApiSchema<"FacultyReport">> {
  return unwrapApiResult(await apiClient.GET("/functions/v1/reports/faculty", { signal }))
}

export async function getFacultyDepartments(
  signal?: AbortSignal,
): Promise<ApiSchema<"Department">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/department", { signal }))
}

export async function getDeanAttemptResults(
  signal?: AbortSignal,
): Promise<ApiSchema<"AttemptResult">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/attempt_result", { signal }))
}
