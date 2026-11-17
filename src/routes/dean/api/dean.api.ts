import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"

export async function getFacultyReport(): Promise<ApiSchema<"FacultyReport">> {
  return unwrapApiResult(await apiClient.GET("/functions/v1/reports/faculty"))
}

export async function getFacultyDepartments(): Promise<ApiSchema<"Department">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/department"))
}

export async function getDeanStudents(): Promise<ApiSchema<"StudentRosterResponse">> {
  return unwrapApiResult(await apiClient.GET("/functions/v1/students"))
}

export async function getDeanStudentChecklist(
  studentId: string,
): Promise<ApiSchema<"StudentChecklistResponse">> {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/students/{student_id}/checklist", {
      params: { path: { student_id: studentId } },
    }),
  )
}

export async function getDeanStudentGrades(
  studentId: string,
): Promise<ApiSchema<"TermGrades">[]> {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/students/{student_id}/grades", {
      params: { path: { student_id: studentId } },
    }),
  )
}

export async function getDeanCourses(): Promise<ApiSchema<"Course">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/course"))
}

export async function getDeanAttemptResults(): Promise<ApiSchema<"AttemptResult">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/attempt_result"))
}

export async function getDeanAuditLogEntries(): Promise<ApiSchema<"AuditLogEntry">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/audit_log_entry"))
}

export async function postDeanAuditViewEvent(
  body: ApiSchema<"AuditViewEventRequest">,
): Promise<ApiSchema<"AuditLogEntry">> {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/audit/view-event", { body }),
  )
}
