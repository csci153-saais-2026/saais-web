import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "@/context/auth-context"
import {
  getMockDatabase,
  loginAsMockPersona,
  logoutMockPersona,
  resetMockDatabase,
} from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import DeanPortal from "@/routes/dean/DeanPortal"

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

function makeMockAuth(): AuthContextValue {
  return {
    user: {
      id: "dean-1",
      email: "paz.villanueva@example.edu.ph",
      fullName: "Dr. Paz Villanueva",
      primaryRole: "dean",
      roles: ["dean"],
      status: "active",
    },
    profile: null,
    session: null,
    roles: ["dean"],
    roleAssignments: [
      {
        id: "ra-1",
        profile_id: "dean-1",
        role: "dean",
        created_at: "2026-10-01T00:00:00Z",
      },
    ],
    roleScopes: [{ role: "dean", facultyId: null, departmentId: null }],
    activeRole: "dean",
    primaryRole: "dean",
    isLoading: false,
    isAuthenticated: true,
    isAllowedToEnter: true,
    entryBlockedReason: null,
    authError: null,
    isPasswordRecovery: false,
    keepSignedIn: false,
    isMockMode: true,
    activePersonaKey: null,
    signInWithPassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    retryHydration: vi.fn(),
    setActiveRole: vi.fn(),
    switchMockPersona: vi.fn(),
  }
}

function renderDeanAt(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={makeMockAuth()}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/dean/*" element={<DeanPortal />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

beforeAll(() => saaisMockServer.listen())
afterEach(() => {
  cleanup()
  saaisMockServer.resetHandlers()
  resetMockDatabase()
  logoutMockPersona()
})
afterAll(() => saaisMockServer.close())

describe("DeanPortal (MSW integration)", () => {
  it("loads Reports from MSW, opens cohort drill-down into student modal, and opens PDF preview", async () => {
    loginAsMockPersona("dean")
    renderDeanAt("/dean/reports")

    expect(
      await screen.findByRole("heading", { name: "Reports" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(await screen.findByText(/Faculty of Computing · read-only/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull()
    expect(await screen.findByText("Final grade distribution")).toBeTruthy()
    expect(screen.getByText("GWA by batch and curriculum")).toBeTruthy()

    const viewButtons = screen.getAllByRole("button", { name: /View students/ })
    fireEvent.click(viewButtons[0])
    expect(await screen.findByText(/Batch \d+ · Student GWA/)).toBeTruthy()

    const firstStudent = getMockDatabase().profiles.find((p) => p.student_number != null)!
    fireEvent.click(screen.getByRole("button", { name: firstStudent.full_name }))

    expect(await screen.findByRole("tab", { name: "Checklist" })).toBeTruthy()
    expect(screen.queryByText(/Read-only Dean view\./)).toBeNull()
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0])

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }))
    expect(await screen.findByText("Preview: Faculty reports")).toBeTruthy()
  }, 15000)

  it("shows error state and recovers on Retry when reports endpoint fails", async () => {
    loginAsMockPersona("dean")
    saaisMockServer.use(
      http.get("*/functions/v1/reports/faculty", () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    )

    renderDeanAt("/dean/reports")
    expect(
      await screen.findByText(/Unable to load faculty reports/i, {}, { timeout: 5000 }),
    ).toBeTruthy()

    saaisMockServer.resetHandlers()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText("Final grade distribution")).toBeTruthy()
  })

  it("loads Students from MSW, filters, opens 3-tab modal without notice banner, and logs view event", async () => {
    loginAsMockPersona("dean")
    renderDeanAt("/dean/students")

    expect(
      await screen.findByRole("heading", { name: "Students" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(await screen.findByText(/opening a record is logged/)).toBeTruthy()

    const firstStudent = getMockDatabase().profiles.find(
      (p) => p.student_number != null,
    )!
    expect(await screen.findByText(firstStudent.full_name)).toBeTruthy()

    const searchInput = screen.getByPlaceholderText("Search by student name or ID")
    fireEvent.change(searchInput, { target: { value: "nonexistent-student-xyz" } })
    expect(screen.getByText("No students match these filters.")).toBeTruthy()

    fireEvent.click(screen.getAllByRole("button", { name: "Reset filters" })[0])
    const studentRow = await screen.findByRole("button", {
      name: `Open read-only record for ${firstStudent.full_name}`,
    })
    fireEvent.click(studentRow)

    expect(await screen.findByRole("tab", { name: "Checklist" })).toBeTruthy()
    expect(screen.queryByText(/Read-only Dean view\./)).toBeNull()
    expect(screen.getByRole("tab", { name: "Grades" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Audit log" })).toBeTruthy()

    const gradesTab = screen.getByRole("tab", { name: "Grades" })
    fireEvent.mouseDown(gradesTab, { button: 0 })
    fireEvent.click(gradesTab)
    expect(await screen.findByText("Grades by term")).toBeTruthy()

    const auditTab = screen.getByRole("tab", { name: "Audit log" })
    fireEvent.mouseDown(auditTab, { button: 0 })
    fireEvent.click(auditTab)
    expect(await screen.findByText("Record audit trail")).toBeTruthy()

    await waitFor(() => {
      expect(
        getMockDatabase().auditLogEntries.some(
          (entry) => entry.action === "student_record_viewed",
        ),
      ).toBe(true)
    })
  })

  it("loads and filters the faculty audit log from MSW with Asia/Manila dates", async () => {
    loginAsMockPersona("dean")
    renderDeanAt("/dean/audit-log")

    expect(
      await screen.findByRole("heading", { name: "Audit log" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(await screen.findByText(/read-only, cannot be edited/)).toBeTruthy()
    expect(await screen.findByText("Audit events")).toBeTruthy()

    const personInput = screen.getByLabelText("Person")
    fireEvent.change(personInput, { target: { value: "nonexistent-actor-xyz" } })
    expect(screen.getByText("No audit records match these filters.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.queryByText("No audit records match these filters.")).toBeNull()
  })
})
