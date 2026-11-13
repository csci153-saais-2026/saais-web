import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import App from "@/App"
import { SAMPLE_AUDIT_EVENTS } from "./audit-log/audit-data"

afterEach(cleanup)
beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = vi.fn()
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true,
    value: vi.fn((query: string) => ({ matches: false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })) })
})

function openPortal(path: string) {
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
  ])("renders the %s route in Jerome's layout", async (path, heading) => {
    openPortal(`/department-head/${path}`)
    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Curriculum transfers" })).toBeTruthy()
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
