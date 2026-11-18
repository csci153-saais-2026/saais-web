import { http, HttpResponse } from "msw"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { loginAsMockPersona, logoutMockPersona, resetMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import {
  getDeanAuditLogEntries,
  getDeanFaculties,
  getDeanStudents,
  getFacultyReport,
  postDeanAuditViewEvent,
} from "@/routes/dean/api/dean.api"
import { toManilaDayKey } from "@/routes/dean/utils/audit-date"

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
  it("fetches faculty report and faculties for an authorized dean and rejects unauthorized roles", async () => {
    loginAsMockPersona("dean")
    const [report, faculties] = await Promise.all([
      getFacultyReport(),
      getDeanFaculties(),
    ])

    expect(report.total_students).toBeGreaterThanOrEqual(0)
    expect(faculties.some((f) => f.id === report.faculty_id)).toBe(true)

    loginAsMockPersona("student")
    await expect(getFacultyReport()).rejects.toThrow()
  })

  it("paginates through all pages when fetching dean students", async () => {
    loginAsMockPersona("dean")
    const seenOffsets: string[] = []

    saaisMockServer.use(
      http.get("*/functions/v1/students", ({ request }) => {
        const offset = new URL(request.url).searchParams.get("offset") ?? "0"
        seenOffsets.push(offset)
        const count = offset === "0" ? 100 : 1
        return HttpResponse.json({
          total_count: 101,
          unassigned_count: 0,
          with_deficiencies_count: 0,
          flagged_count: 0,
          open_inc_students_count: 0,
          standing_counts: {
            good_standing: 101,
            warning: 0,
            probation: 0,
            dismissed: 0,
          },
          items: Array.from({ length: count }, (_, i) => ({
            student_id: `stu-${offset}-${i}`,
            student_number: `24-1-${offset}-${i}`,
            full_name: `Student ${offset}-${i}`,
            email: `stu-${offset}-${i}@example.edu.ph`,
            avatar_url: null,
            status: "active",
            faculty_id: "fac-1",
            faculty_name: "Faculty of Computing",
            department_id: "dept-1",
            department_name: "DCST",
            program_id: "prog-1",
            program_code: "BSCS",
            program_name: "BS Computer Science",
            curriculum_version_id: "cur-1",
            curriculum_label: "BSCS 2024",
            entry_year: 2024,
            year_level: 2,
            gwa: 1.75,
            earned_units: 36,
            required_units: 147,
            standing: "good_standing",
            is_delinquent: false,
            deficiencies_count: 0,
            open_inc_count: 0,
            lapsed_inc_count: 0,
            open_flags_count: 0,
            nearest_inc_deadline: null,
            assignment_status: "active",
            adviser_id: null,
            adviser_name: null,
            adviser_assigned_since: null,
            handover_label: null,
            last_activity_at: null,
          })),
        })
      }),
    )

    const response = await getDeanStudents()
    expect(seenOffsets).toEqual(["0", "100"])
    expect(response.items).toHaveLength(101)
  })

  it("posts audit view events and derives Manila day keys accurately", async () => {
    loginAsMockPersona("dean")

    const created = await postDeanAuditViewEvent({
      event_type: "pdf_exported",
      report_type: "faculty",
      details: "Exported faculty report (All departments) as PDF",
    })

    expect(created.action).toBe("pdf_exported")
    const entries = await getDeanAuditLogEntries()
    expect(entries.some((entry) => entry.id === created.id)).toBe(true)

    // 2026-10-14T18:00:00Z is 2026-10-15 02:00 in Asia/Manila (UTC+8)
    expect(toManilaDayKey("2026-10-14T18:00:00Z")).toBe("2026-10-15")
    expect(toManilaDayKey("invalid-date")).toBe("")
  })
})
