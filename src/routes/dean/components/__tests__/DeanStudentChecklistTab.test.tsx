import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import { DeanStudentChecklistTab } from "@/routes/dean/components/DeanStudentChecklistTab"
import type { DeanStudentSummary } from "@/routes/dean/types"

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
  cleanup()
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})
afterAll(() => saaisMockServer.close())

describe("DeanStudentChecklistTab", () => {
  it("loads checklist from MSW and opens read-only Course Info modal", async () => {
    loginAsMockPersona("dean")
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const student: DeanStudentSummary = {
      studentId: MOCK_IDS.studentPrimary,
      studentNumber: "24-1-00101",
      name: "Student Primary",
      initials: "SP",
      departmentId: MOCK_IDS.deptDcst,
      department: "DCST",
      curriculum: "BSCS 2025",
      adviser: "Adviser",
      program: "BS Computer Science",
      yearLabel: "2nd Year",
      email: "student@example.edu.ph",
      standing: "good",
      gwa: "1.75",
      unitsEarned: 36,
      unitsRequired: 147,
      entryYear: 2024,
    }

    render(
      <QueryClientProvider client={queryClient}>
        <DeanStudentChecklistTab student={student} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText("36 units earned")).toBeTruthy()
    expect(await screen.findByText(/Year 1 · Semester 1/)).toBeTruthy()

    const infoButtons = screen.getAllByRole("button", { name: "Course info" })
    fireEvent.click(infoButtons[0])

    expect(await screen.findByText(/units · Category:/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0])
  })
})
