import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import App from "@/App"
import { setMockSessionToken } from "@/lib/api"
import { SYNTHETIC_DEPT_HEAD_ONLY_ID, type SyntheticPersonaKey } from "@/lib/auth/mock-auth-service"
import { getMockDatabase, MOCK_IDS, MOCK_PERSONAS } from "@/mocks"
import { getAuditEvents } from "./shared/dh-api"
import { setupDepartmentHeadMockApi } from "./test-utils"

setupDepartmentHeadMockApi()
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

describe("Department Head integration", () => {
  it("retains an applied reassignment across pages and records its audit event", async () => {
    openPortal("/department-head/adviser-assignments")
    fireEvent.click(await screen.findByRole("checkbox", { name: "Select Sta. Agata, Jerome Daniel S." }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "New adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Coting, Eulo Rod M." }))
    fireEvent.change(within(dialog).getByLabelText("Reason for reassignment"), { target: { value: "Workload adjustment" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply reassignment" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.click(screen.getByRole("link", { name: "Students" }))
    const row = await screen.findByRole("row", { name: /Sta\. Agata, Jerome Daniel S\./ })
    await waitFor(() => expect(within(row).getByText("Coting, Eulo Rod M.")).toBeTruthy())
    fireEvent.click(screen.getByRole("link", { name: "Audit log" }))
    expect(await screen.findByText(/Reassigned to Coting, Eulo Rod M\. effective/)).toBeTruthy()
  })

  it.each([
    ["students", "Students"],
    ["adviser-assignments", "Adviser assignments"],
    ["reports", "Department reports"],
    ["audit-log", "Audit log"],
    ["settings", "Settings"],
    ["notifications", "Notifications"],
  ])("renders the %s route", async (path, heading) => {
    openPortal(`/department-head/${path}`)
    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy()
  })

  it("redirects a signed-out visitor to login before showing Department Head content", async () => {
    openPortal("/department-head/reports", null)
    expect(await screen.findByLabelText("Institutional email")).toBeTruthy()
    expect(window.location.pathname).toBe("/login")
    expect(screen.queryByRole("heading", { name: "Department reports" })).toBeNull()
  })

  it("redirects a Head-only account away from Adviser routes", async () => {
    openPortal("/adviser/advisees")
    expect(await screen.findByRole("heading", { name: /curriculum transfer/i })).toBeTruthy()
    expect(window.location.pathname).toBe("/department-head/curriculum-transfers")
  })
  it("shares API notification state between the list and the top bar", async () => {
    // Test-local notifications for the signed-in department head; the shared store is reset before every test.
    getMockDatabase().notifications.push(...[SYNTHETIC_DEPT_HEAD_ONLY_ID, MOCK_PERSONAS.department_head.profileId].flatMap((recipient, who) => [1, 2].map((index) => ({
      id: `00000000-0000-4000-8000-0000000009${who}${index}`, recipient_id: recipient, kind: "transfer" as const,
      event_type: "curriculum_transfer_endorsed" as const, title: `Transfer request ${index}`, body: "An adviser endorsed a curriculum transfer.",
      target_route: "/department-head/curriculum-transfers", target_student_id: null, actor_id: MOCK_IDS.adviserPrimary,
      entity_type: "curriculum_transfer_request", entity_id: null, dedupe_key: null, email_delivery_status: "sent" as const,
      is_read: false, read_at: null, created_at: `2026-11-1${index}T08:00:00Z`,
    }))))
    openPortal("/department-head/notifications")
    await screen.findByRole("heading", { name: "Notifications" })
    await screen.findByRole("button", { name: "Unread (2)" })
    expect(await screen.findByRole("button", { name: "Notifications, 2 unread" })).toBeTruthy()
    fireEvent.click(screen.getAllByRole("button", { name: "Mark read" })[0])
    await screen.findByRole("button", { name: "Unread (1)" })
    fireEvent.click(screen.getByRole("link", { name: "Students" }))
    await screen.findByRole("heading", { name: "Students" })
    expect(await screen.findByRole("button", { name: "Notifications, 1 unread" })).toBeTruthy()
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
    const before = (await getAuditEvents()).length
    openPortal("/department-head/students")
    fireEvent.click(await screen.findByRole("button", { name: "View Sta. Agata, Jerome Daniel S. checklist" }))
    const dialog = await screen.findByRole("dialog", { name: "Sta. Agata, Jerome Daniel S. · Checklist" })
    await within(dialog).findByText(/Year 1 · Semester 1/)
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Close" }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.click(screen.getByRole("link", { name: "Audit log" }))
    expect(await screen.findByText(`${before} matching ${before === 1 ? "event" : "events"} of ${before}`)).toBeTruthy()
  })

  it("keeps a selected adviser filter visible after all their students move", async () => {
    openPortal("/department-head/adviser-assignments")
    fireEvent.keyDown(await screen.findByRole("combobox", { name: "Adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Coting, Eulo Rod M." }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all visible students" }))
    fireEvent.click(screen.getByRole("button", { name: "Reassign selected" }))
    const dialog = screen.getByRole("dialog")
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "New adviser" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Polo, Marco Antonio P." }))
    fireEvent.change(within(dialog).getByLabelText("Reason for reassignment"), { target: { value: "Roster redistribution" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply reassignment" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByRole("combobox", { name: "Adviser" }).textContent).toContain("Coting, Eulo Rod M.")
    expect(await screen.findByText("No students match these filters.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByText("Showing 26 of 26 assignments")).toBeTruthy()
  })
})
