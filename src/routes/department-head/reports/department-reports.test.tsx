import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import DepartmentReportsPage from "./DepartmentReportsPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

vi.mock("../shared/department-pdf", () => ({ createDepartmentPdf: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })) }))
setupDepartmentHeadMockApi()

async function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: option }))
}

async function openReport() {
  renderDepartmentHead(<DepartmentReportsPage />)
  await screen.findByLabelText("Selected department report")
}

describe("Department Reports", () => {
  it("builds the current term's report from the department's students", async () => {
    await openReport()
    expect(screen.getByText("26")).toBeTruthy()
    expect(screen.getByText("GWA distribution")).toBeTruthy()
    expect(screen.getByText(/students have a cumulative GWA · Percentages sum to 100%\./)).toBeTruthy()
    expect(screen.getByText("Department summary")).toBeTruthy()
    const table = screen.getByRole("table", { name: "GWA by batch and curriculum" })
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1)
  })

  it("opens only the selected cohort's students", async () => {
    await openReport()
    const [button] = screen.getAllByRole("button", { name: /View students for .* batch \d{4}/ })
    fireEvent.click(button)
    const dialog = await screen.findByRole("dialog", { name: /Batch \d{4} · Student GWA/ })
    const table = within(dialog).getByRole("table", { name: "Cohort student GWA" })
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(1)
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Close" }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("shows an honest empty state and disables export for a term without a report", async () => {
    await openReport()
    await choose("Academic term", "AY 2025–2026 · 2nd semester")
    expect(screen.getByText("No report available")).toBeTruthy()
    expect(screen.queryByRole("table", { name: "GWA by batch and curriculum" })).toBeNull()
    expect((screen.getByRole("button", { name: "Export PDF" }) as HTMLButtonElement).disabled).toBe(true)
    // Opening the Radix term select over the rendered report is very slow in jsdom (~30s here), so allow extra time.
  }, 120_000)

  it("opens the selected report in the PDF viewer before downloading", async () => {
    URL.createObjectURL = vi.fn(() => "blob:report")
    URL.revokeObjectURL = vi.fn()
    await openReport()
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
    const dialog = await screen.findByRole("dialog", { name: /Preview: Department reports/ })
    const download = await within(dialog).findByRole("link", { name: "Download PDF" })
    expect(download.getAttribute("download")).toMatch(/^SAAIS-department-report-.*-all\.pdf$/)
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeTruthy()
  })
})
