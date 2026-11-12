import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import DepartmentReportsPage from "./DepartmentReportsPage"
import { downloadReportPdf } from "./report-pdf"

vi.mock("./report-pdf", () => ({ downloadReportPdf: vi.fn() }))

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn() })
afterAll(() => { HTMLElement.prototype.scrollIntoView = originalScrollIntoView })
afterEach(() => { cleanup(); vi.clearAllMocks() })

async function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: option }))
}

describe("Department Reports", () => {
  it("changes department totals, distribution and cohort scope with the selected program and term", async () => {
    render(<DepartmentReportsPage />)
    expect(screen.getByText("612")).toBeTruthy()
    expect(screen.getByText("1.87")).toBeTruthy()
    await choose("Degree program", "BS Information Technology")
    expect(screen.getByText("184")).toBeTruthy()
    expect(screen.getByText("1.93")).toBeTruthy()
    const table = screen.getByRole("table", { name: "GWA by batch and curriculum" })
    expect(within(table).queryByText("BSCS 2021")).toBeNull()
    expect(within(table).getAllByText("BSIT 2024")).toHaveLength(4)
    await choose("Academic term", "AY 2024–2025 · 2nd semester")
    expect(screen.getByText("173")).toBeTruthy()
    expect(screen.getByText("1.97")).toBeTruthy()
    expect(within(table).getByText("2021")).toBeTruthy()
  })

  it("opens only the selected cohort's student GWA examples", async () => {
    render(<DepartmentReportsPage />)
    await choose("Degree program", "BS Information Technology")
    fireEvent.click(screen.getByRole("button", { name: "View students for BSIT 2024 batch 2025" }))
    const dialog = screen.getByRole("dialog", { name: "Batch 2025 · Student GWA" })
    expect(within(dialog).getByText("52 fictional students · BSIT · BSIT 2024")).toBeTruthy()
    const table = within(dialog).getByRole("table", { name: "Cohort student GWA" })
    expect(within(table).getAllByRole("row")).toHaveLength(53)
    expect(within(table).queryByText("BSCS 2024")).toBeNull()
    expect(within(table).getByText("25-1-95100")).toBeTruthy()
    fireEvent.click(within(dialog).getByRole("button", { name: "Close preview" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("shows an honest empty state and disables export when no fixture exists", async () => {
    render(<DepartmentReportsPage />)
    await choose("Academic term", "AY 2023–2024 · 2nd semester (no sample)")
    expect(screen.getByText("No sample report available")).toBeTruthy()
    expect(screen.queryByRole("table", { name: "GWA by batch and curriculum" })).toBeNull()
    expect((screen.getByRole("button", { name: "Export PDF" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Show latest sample report" }))
    expect(screen.getByText("612")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Export PDF" }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("exports the selected report and provides feedback if PDF generation fails", async () => {
    render(<DepartmentReportsPage />)
    await choose("Degree program", "BS Computer Science")
    await choose("Academic term", "AY 2024–2025 · 2nd semester")
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
    expect(downloadReportPdf).toHaveBeenCalledWith(expect.objectContaining({ termId: "2024-2025-2", programKey: "bscs", enrolled: 401 }))
    vi.mocked(downloadReportPdf).mockImplementationOnce(() => { throw new Error("Unavailable browser download") })
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
    expect(screen.getByRole("alert").textContent).toContain("The PDF could not be created")
  })
})
