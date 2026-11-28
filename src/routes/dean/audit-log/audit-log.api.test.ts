import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import {
  loginAsMockPersona,
  logoutMockPersona,
  resetMockDatabase,
} from "@/mocks";
import { saaisMockServer } from "@/mocks/node";
import { toManilaDayKey } from "@/routes/dean/audit-log/audit-date";
import {
  getDeanAuditLogEntries,
  postDeanAuditViewEvent,
} from "@/routes/dean/audit-log/audit-log.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...api,
    apiClient: api.createSaaisApiClient({
      baseUrl: "https://saais-mock.supabase.co",
      apiKey: "mock",
      mode: "mock",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  };
});

beforeAll(() => saaisMockServer.listen());
afterEach(() => {
  saaisMockServer.resetHandlers();
  resetMockDatabase();
  logoutMockPersona();
});
afterAll(() => saaisMockServer.close());

describe("audit-log.api", () => {
  it("merges audit queries by microsecond precision before applying the ID tie-breaker", async () => {
    loginAsMockPersona("dean");
    saaisMockServer.use(
      http.get("*/rest/v1/audit_log_entry", ({ request }) => {
        const linked = new URL(request.url).searchParams.has("student_id");
        return HttpResponse.json(
          linked
            ? [
                { id: "b", created_at: "2026-10-14T18:00:00.1239Z" },
                { id: "a", created_at: "2026-10-14T18:00:00.1239Z" },
              ]
            : [{ id: "c", created_at: "2026-10-15T02:00:00.123100+08:00" }],
        );
      }),
    );

    const entries = await getDeanAuditLogEntries(undefined, {
      id: "11111111-1111-4111-8111-111111111111",
      number: "24-1-00124",
    });
    expect(entries.map(({ id }) => id)).toEqual(["b", "a", "c"]);
  });

  it("posts audit view events, fetches entries, and derives Manila day keys accurately", async () => {
    loginAsMockPersona("dean");

    const created = await postDeanAuditViewEvent({
      event_type: "pdf_exported",
      report_type: "faculty",
      details: "Exported faculty report (All departments) as PDF",
    });

    expect(created.action).toBe("pdf_exported");
    const entries = await getDeanAuditLogEntries();
    expect(entries.some((entry) => entry.id === created.id)).toBe(true);

    // 2026-10-14T18:00:00Z is 2026-10-15 02:00 in Asia/Manila (UTC+8)
    expect(toManilaDayKey("2026-10-14T18:00:00Z")).toBe("2026-10-15");
    expect(toManilaDayKey("invalid-date")).toBe("");
  });
});
