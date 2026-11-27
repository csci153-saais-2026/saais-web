import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";

export const DEAN_AUDIT_LIMIT = 1000;

export async function getDeanAuditLogEntries(
  signal?: AbortSignal,
): Promise<ApiSchema<"AuditLogEntry">[]> {
  return unwrapApiResult(
    // The newest entries, up to the gateway's page maximum.
    await apiClient.GET("/rest/v1/audit_log_entry", {
      params: {
        query: { order: "created_at.desc,id.desc", limit: DEAN_AUDIT_LIMIT },
      },
      signal,
    }),
  );
}

export async function postDeanAuditViewEvent(
  body: ApiSchema<"AuditViewEventRequest">,
): Promise<ApiSchema<"AuditLogEntry">> {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/audit/view-event", { body }),
  );
}
