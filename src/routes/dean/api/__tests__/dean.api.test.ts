import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { loginAsMockPersona, logoutMockPersona, resetMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import {
  getDeanAuditLogEntries,
  getFacultyReport,
  postDeanAuditViewEvent,
} from "@/routes/dean/api/dean.api"

vi.mock("@/lib/api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...api,
    apiClient: api.createSaaisApiClient({
      baseUrl: "https://saais-mock.supabase.co",
      apiKey: "mock",
      mode: "mock",
      fetch: (...args) => globalThis.fetch(...args),
    }),
  }
})

beforeAll(() => saaisMockServer.listen())
afterEach(() => {
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})
afterAll(() => saaisMockServer.close())

describe("dean.api", () => {
  it("fetches faculty report for an authorized dean and rejects unauthorized roles", async () => {
    loginAsMockPersona("dean")
    const report = await getFacultyReport()

    expect(report.total_students).toBeGreaterThanOrEqual(0)
    expect(report.department_summaries.length).toBeGreaterThan(0)

    loginAsMockPersona("student")
    await expect(getFacultyReport()).rejects.toThrow()
  })

  it("posts audit view events and reads them back from audit_log_entry", async () => {
    loginAsMockPersona("dean")

    const created = await postDeanAuditViewEvent({
      event_type: "pdf_exported",
      report_type: "faculty",
      details: "Exported faculty report (All departments) as PDF",
    })

    expect(created.action).toBe("pdf_exported")
    expect(created.details_summary).toContain("Exported faculty report")

    const entries = await getDeanAuditLogEntries()
    expect(entries.some((entry) => entry.id === created.id)).toBe(true)
  })
})
