import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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
