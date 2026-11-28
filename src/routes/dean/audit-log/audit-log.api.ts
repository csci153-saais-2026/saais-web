import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";

export const DEAN_AUDIT_LIMIT = 1000;

function subMillisecondMicros(timestamp: string): number {
  const digits = /\.\d{3}(\d{1,3})/.exec(timestamp)?.[1];
  return digits ? Number(digits.padEnd(3, "0")) : 0;
}

export async function getDeanAuditLogEntries(
  signal?: AbortSignal,
  student?: { id: string; number: string },
): Promise<ApiSchema<"AuditLogEntry">[]> {
  if (student) {
    const [linked, historical] = await Promise.all([
      readAuditPage({ student_id: postgrestFilter.eq(student.id) }, signal),
      readAuditPage(
        { student_number: postgrestFilter.eq(student.number) },
        signal,
      ),
    ]);
    return [
      ...new Map(
        [...linked, ...historical].map((row) => [row.id, row]),
      ).values(),
    ]
      .sort(
        (a, b) =>
          Date.parse(b.created_at) - Date.parse(a.created_at) ||
          subMillisecondMicros(b.created_at) -
            subMillisecondMicros(a.created_at) ||
          b.id.localeCompare(a.id),
      )
      .slice(0, DEAN_AUDIT_LIMIT);
  }
  return readAuditPage({}, signal);
}

async function readAuditPage(
  filter: { student_id?: string; student_number?: string },
  signal?: AbortSignal,
): Promise<ApiSchema<"AuditLogEntry">[]> {
  return unwrapApiResult(
    // The newest entries, up to the gateway's page maximum.
    await apiClient.GET("/rest/v1/audit_log_entry", {
      params: {
        query: {
          ...filter,
          order: "created_at.desc,id.desc",
          limit: DEAN_AUDIT_LIMIT,
        },
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
