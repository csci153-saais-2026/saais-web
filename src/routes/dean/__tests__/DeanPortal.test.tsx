import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "@/context/auth-context"
import DeanPortal from "@/routes/dean/DeanPortal"

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
  return render(
    <AuthContext.Provider value={makeMockAuth()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/dean/*" element={<DeanPortal />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe("DeanPortal", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    sessionStorage.clear()
  })

  it("renders Faculty reports with stats, grade distribution, and cohort drill-down dialog", async () => {
    renderDeanAt("/dean/reports")

    expect(
      await screen.findByRole("heading", { name: "Faculty reports" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText("359")).toBeTruthy()
    expect(screen.getByText("1.98")).toBeTruthy()
    expect(screen.getByText("61")).toBeTruthy()
    expect(screen.getByText("1.00–1.50")).toBeTruthy()

    const viewButtons = screen.getAllByRole("button", { name: "View students" })
    fireEvent.click(viewButtons[0])

    expect(await screen.findByText("Students behind this number")).toBeTruthy()
    expect(
      screen.getByText("Opening this list is recorded in the audit log."),
    ).toBeTruthy()
  })

  it("filters the student directory and shows empty state with reset", async () => {
    renderDeanAt("/dean/students")

    expect(
      await screen.findByRole("heading", { name: "Students" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText("Ana Reyes")).toBeTruthy()

    const searchInput = screen.getByPlaceholderText("Name or student number")
    fireEvent.change(searchInput, { target: { value: "23-1-01234" } })

    expect(screen.getByText("Ana Reyes")).toBeTruthy()
    expect(screen.queryByText("Ben Lopez")).toBeNull()

    fireEvent.change(searchInput, { target: { value: "nonexistent-student-xyz" } })
    expect(screen.getByText("No students match these filters.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    await waitFor(() => {
      expect(screen.getByText("Ben Lopez")).toBeTruthy()
    })
  })

  it("renders read-only student detail with only Checklist, Grades, and Audit log tabs", async () => {
    renderDeanAt("/dean/students/23-1-01234")

    expect(
      await screen.findByRole("heading", { name: "Ana Reyes" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText(/Read-only Dean view\./)).toBeTruthy()

    expect(screen.getByRole("tab", { name: "Checklist" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Grades" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Audit log" })).toBeTruthy()
    expect(screen.queryByRole("tab", { name: "Curriculum" })).toBeNull()
    expect(screen.queryByRole("tab", { name: "Advising" })).toBeNull()
    expect(screen.queryByRole("tab", { name: "Notes" })).toBeNull()

    const gradesTab = screen.getByRole("tab", { name: "Grades" })
    fireEvent.mouseDown(gradesTab, { button: 0 })
    fireEvent.click(gradesTab)
    expect(await screen.findByText("Grades by term")).toBeTruthy()

    const auditTab = screen.getByRole("tab", { name: "Audit log" })
    fireEvent.mouseDown(auditTab, { button: 0 })
    fireEvent.click(auditTab)
    expect(await screen.findByText("Record audit trail")).toBeTruthy()
  })

  it("renders and filters the faculty audit log", async () => {
    renderDeanAt("/dean/audit-log")

    expect(
      await screen.findByRole("heading", { name: "Audit log" }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText("Opened checklist")).toBeTruthy()
    expect(screen.getByText("CSci 25 final: 2.25 → 2.50")).toBeTruthy()

    const personInput = screen.getByLabelText("Person")
    fireEvent.change(personInput, { target: { value: "Paz" } })

    expect(
      screen.getByText("Report drill-down: batch 2023 (96 students)"),
    ).toBeTruthy()
    expect(screen.queryByText("Opened checklist")).toBeNull()
  })
})
