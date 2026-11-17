import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"

export async function getFacultyReport(): Promise<ApiSchema<"FacultyReport">> {
  return unwrapApiResult(await apiClient.GET("/functions/v1/reports/faculty"))
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

