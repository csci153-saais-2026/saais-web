import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { loginAsMockPersona, logoutMockPersona, MOCK_IDS, resetMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import { DeanStudentRecordDialog } from "@/routes/dean/students/DeanStudentRecordDialog"
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

describe("DeanStudentRecordDialog", () => {
  it("renders Checklist, Grades, and Audit log tabs without read-only explanatory text", async () => {
    loginAsMockPersona("dean")
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const onClose = vi.fn()

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
        <DeanStudentRecordDialog student={student} onClose={onClose} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText("36 units earned")).toBeTruthy()
    expect(screen.queryByText(/Read-only Dean inspection/i)).toBeNull()

    const gradesTab = screen.getByRole("tab", { name: "Grades" })
    fireEvent.mouseDown(gradesTab, { button: 0 })
    fireEvent.click(gradesTab)
    expect(await screen.findByText("Grades by term")).toBeTruthy()
    expect(screen.queryByText(/Read-only transcript summary/i)).toBeNull()
    expect(screen.queryByText(/restricted to assigned advisers/i)).toBeNull()

    const auditTab = screen.getByRole("tab", { name: "Audit log" })
    fireEvent.mouseDown(auditTab, { button: 0 })
    fireEvent.click(auditTab)
    expect(await screen.findByText("Record audit trail")).toBeTruthy()
    expect(screen.queryByText(/Immutable view and grade change events/i)).toBeNull()

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
