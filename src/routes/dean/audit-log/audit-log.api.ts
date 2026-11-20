import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api"

export async function getDeanAuditLogEntries(
  signal?: AbortSignal,
): Promise<ApiSchema<"AuditLogEntry">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/audit_log_entry", { signal }))
}

export async function postDeanAuditViewEvent(
  body: ApiSchema<"AuditViewEventRequest">,
): Promise<ApiSchema<"AuditLogEntry">> {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/audit/view-event", { body }),
  )
}
