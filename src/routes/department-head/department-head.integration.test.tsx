import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import App from "@/App"
import { setMockSessionToken } from "@/lib/api"
import type { SyntheticPersonaKey } from "@/lib/auth/mock-auth-service"
import { SAMPLE_AUDIT_EVENTS } from "./audit-log/audit-data"

beforeEach(() => vi.stubEnv("VITE_API_MODE", "mock"))
afterEach(() => {
  cleanup()
  sessionStorage.removeItem("saais_active_mock_persona")
  setMockSessionToken(null)
  vi.unstubAllEnvs()
})
beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true,
    value: vi.fn((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })) })
})

function openPortal(path: string, persona: SyntheticPersonaKey | null = "department_head_only") {
  if (persona) sessionStorage.setItem("saais_active_mock_persona", persona)
  window.history.replaceState(null, "", path)
  render(<App />)
}

describe("Department Head preview integration", () => {
  it("retains an applied reassignment across pages and records its sample audit event", async () => {
    openPortal("/department-head/adviser-assignments")
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Ana Marie Santos" }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "New adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Prof. Marco Villanueva" }))
    fireEvent.change(within(dialog).getByLabelText("Reason for reassignment"), { target: { value: "Demo workload adjustment" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply reassignment" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.click(screen.getByRole("link", { name: "Students" }))
    const row = await screen.findByRole("row", { name: /Ana Marie Santos/ })
    expect(within(row).getByText("Prof. Marco Villanueva")).toBeTruthy()
    fireEvent.click(screen.getByRole("link", { name: "Audit log" }))
    expect(await screen.findByText(/Reassigned to Prof. Marco Villanueva effective/)).toBeTruthy()
  })

  it.each([
    ["students", "Students"],
    ["adviser-assignments", "Adviser assignments"],
    ["reports", "Department reports"],
    ["audit-log", "Audit log"],
    ["settings", "Settings"],
    ["notifications", "Notifications"],
  ])("renders the %s route inside one shared shell", async (path, heading) => {
    openPortal(`/department-head/${path}`)
    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Curriculum transfers" })).toBeTruthy()
    expect(document.querySelectorAll('[data-slot="sidebar-wrapper"]')).toHaveLength(1)
    expect(screen.getAllByRole("banner")).toHaveLength(1)
    expect(within(screen.getByRole("navigation", { name: "breadcrumb" })).getByText(heading, { exact: false })).toBeTruthy()
  })

  it("redirects a signed-out visitor to login before showing Department Head content", async () => {
    openPortal("/department-head/reports", null)
    expect(await screen.findByLabelText("Institutional email")).toBeTruthy()
    expect(window.location.pathname).toBe("/login")
    expect(screen.queryByRole("heading", { name: "Department reports" })).toBeNull()
  })

  it("keeps Adviser Assignments but excludes Adviser portal links for a Head-only account", async () => {
    openPortal("/adviser/advisees")
    expect(await screen.findByRole("heading", { name: /curriculum transfer/i })).toBeTruthy()
    expect(window.location.pathname).toBe("/department-head/curriculum-transfers")
    expect(screen.getByRole("link", { name: "Adviser assignments" }).getAttribute("href"))
      .toBe("/department-head/adviser-assignments")
    expect(screen.queryByRole("link", { name: "Advisees" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Academic Adviser Portal" })).toBeNull()
  })

  it("opens each assigned portal using the shared sidebar for a dual-role account", async () => {
    openPortal("/department-head/reports", "department_head")
    await screen.findByRole("heading", { name: "Department reports" })
    const advisees = screen.getByRole("link", { name: "Advisees" })
    expect(advisees.getAttribute("href")).toBe("/adviser")
    fireEvent.click(advisees)
    expect(await screen.findByRole("heading", { name: "Academic Adviser Portal" })).toBeTruthy()
    expect(window.location.pathname).toBe("/adviser")
    expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull()
    fireEvent.click(screen.getByRole("link", { name: "Academic terms" }))
    expect(await screen.findByRole("heading", { name: /academic terms/i })).toBeTruthy()
    expect(window.location.pathname).toBe("/department-head/academic-terms")
    expect(document.querySelectorAll('[data-slot="sidebar-wrapper"]')).toHaveLength(1)
  })

  it("shares notification read state between the list and the top bar", async () => {
    openPortal("/department-head/notifications")
    await screen.findByRole("heading", { name: "Notifications" })
    expect(screen.getByRole("button", { name: "Notifications, 2 unread" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }))
    expect(screen.getByText("You are all caught up.")).toBeTruthy()
    fireEvent.click(screen.getByRole("link", { name: "Students" }))
    await screen.findByRole("heading", { name: "Students" })
    expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy()
  })

  it("opens reports from the sidebar at the canonical URL", async () => {
    openPortal("/department-head/students")
    await screen.findByRole("heading", { name: "Students" })
    const reportsLink = screen.getByRole("link", { name: "Department reports" })
    expect(reportsLink.getAttribute("href")).toBe("/department-head/reports")
    fireEvent.click(reportsLink)
    expect(await screen.findByRole("heading", { name: "Department reports" })).toBeTruthy()
    expect(window.location.pathname).toBe("/department-head/reports")
  })

  it("opens the read-only checklist without adding an audit event", async () => {
    openPortal("/department-head/students")
    fireEvent.click(await screen.findByRole("button", { name: "View Sofia Isabel Garcia checklist" }))
    const dialog = screen.getByRole("dialog", { name: "Sofia Isabel Garcia · Checklist" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.click(screen.getByRole("link", { name: "Audit log" }))
    const count = SAMPLE_AUDIT_EVENTS.length
    expect(await screen.findByText(`${count} matching events of ${count}`)).toBeTruthy()
  })

  it("keeps a selected adviser filter visible after all their students move", async () => {
    openPortal("/department-head/adviser-assignments")
    fireEvent.keyDown(await screen.findByRole("combobox", { name: "Adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Dr. Elena Reyes" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all visible students" }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "New adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Prof. Marco Villanueva" }))
    fireEvent.change(within(dialog).getByLabelText("Reason for reassignment"), { target: { value: "Demo roster redistribution" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply reassignment" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByRole("combobox", { name: "Adviser" }).textContent).toContain("Dr. Elena Reyes")
    expect(screen.getByText("No students match these filters.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByText("Showing 8 of 8 sample assignments")).toBeTruthy()
  })
})
