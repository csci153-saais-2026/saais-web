import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import AuditLogPage from "./AuditLogPage"
import { PreviewStateProvider } from "./PreviewStateProvider"
import { SAMPLE_AUDIT_EVENTS, type AuditEvent } from "./audit-data"
import { EMPTY_AUDIT_FILTERS, filterAuditEvents } from "./audit-model"

afterEach(cleanup)

describe("Audit Log filters", () => {
  it("combines independent person, student, action and inclusive date filters", () => {
    const result = filterAuditEvents(SAMPLE_AUDIT_EVENTS, {
      person: "  elena  ", student: "24-1-00124", action: "View", from: "2025-08-15", to: "2025-08-15",
    })
    expect(result.map((event) => event.id)).toEqual(["audit-3"])
    expect(filterAuditEvents(SAMPLE_AUDIT_EVENTS, { ...EMPTY_AUDIT_FILTERS, student: "SANTOS" }).map((event) => event.id)).toEqual(["audit-1", "audit-3"])
    expect(filterAuditEvents(SAMPLE_AUDIT_EVENTS, { ...EMPTY_AUDIT_FILTERS, action: "Sign-in" }).map((event) => event.id)).toEqual(["audit-2"])
  })

  it("uses Philippine dates for timestamps near UTC midnight", () => {
    const event: AuditEvent = { ...SAMPLE_AUDIT_EVENTS[0], id: "timezone", timestamp: "2025-08-14T16:30:00Z" }
    expect(filterAuditEvents([event], { ...EMPTY_AUDIT_FILTERS, from: "2025-08-15", to: "2025-08-15" })).toEqual([event])
    expect(filterAuditEvents([event], { ...EMPTY_AUDIT_FILTERS, to: "2025-08-14" })).toEqual([])
  })
})

describe("Audit Log screen", () => {
  function renderPage() {
    return render(<PreviewStateProvider><AuditLogPage /></PreviewStateProvider>)
  }

  it("filters people and students separately and resets all controls", () => {
    renderPage()
    expect(screen.getByText("7 matching events of 7")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Person" }), { target: { value: "Elena" } })
    fireEvent.change(screen.getByRole("searchbox", { name: "Student" }), { target: { value: "Ana" } })
    expect(screen.getByText("1 matching event of 7")).toBeTruthy()
    expect(screen.getByText("Viewed student academic record")).toBeTruthy()
    expect(screen.queryByText("Viewed curriculum checklist")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }))
    expect(screen.getByText("7 matching events of 7")).toBeTruthy()
  })

  it("shows a date-range error and an honest empty state", () => {
    renderPage()
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2025-08-15" } })
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2025-08-14" } })
    expect(screen.getByRole("alert").textContent).toBe("From date must be on or before To date.")
    expect(screen.getByText("Choose a valid date range to view events.")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2025-08-14" } })
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("2 matching events of 7")).toBeTruthy()
    fireEvent.change(screen.getByRole("searchbox", { name: "Student" }), { target: { value: "no such student" } })
    expect(screen.getByText("No entries match these filters.")).toBeTruthy()
  })
})
