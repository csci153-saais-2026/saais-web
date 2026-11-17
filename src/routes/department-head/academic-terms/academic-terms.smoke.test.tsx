import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import AcademicTermsPage from "./AcademicTermsPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

vi.mock("../shared/department-pdf", () => ({ createDepartmentPdf: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })) }))
setupDepartmentHeadMockApi()

async function openPage() {
  renderDepartmentHead(<AcademicTermsPage />)
  await screen.findByText("1 open term · 1 closed term")
}

describe("Academic Terms", () => {
  it("renders the advisory banner, term schedule and counts from the API", async () => {
    await openPage()
    expect(screen.getByText(/Closing encoding prevents further grade entry/i)).toBeDefined()
    expect(screen.queryByText("Active term")).toBeNull()
    expect(screen.getAllByText("2026–2027").length).toBeGreaterThan(0)
    expect(screen.getByText("10 Aug – 18 Dec 2026")).toBeDefined()
    expect(screen.getByRole("button", { name: /Close encoding/i })).toBeDefined()
  })

  it("closes grade encoding for the department after confirmation", async () => {
    await openPage()
    fireEvent.click(screen.getByRole("button", { name: /Close encoding/i }))
    expect(screen.getByRole("heading", { name: "Close grade encoding" })).toBeDefined()
    expect(screen.getByText(/New grade entries will be closed for this term/i)).toBeDefined()
    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /Close encoding|Confirm/i }))
    expect(await screen.findByText(/Encoding closed for 2026–2027 · 1st semester/)).toBeDefined()
    await waitFor(() => expect(screen.getByText("0 open terms · 2 closed terms")).toBeDefined())
  })

  it("adds a term through the API", async () => {
    await openPage()
    fireEvent.click(screen.getByRole("button", { name: /Add a term/i }))
    const dialog = screen.getByRole("dialog")
    fireEvent.change(within(dialog).getByDisplayValue("2025–2026"), { target: { value: "2027–2028" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Add term" }))
    expect(await screen.findByText(/Added academic term 2027–2028/)).toBeDefined()
    await waitFor(() => expect(screen.getAllByText("2027–2028").length).toBeGreaterThan(0))
  })

  it("opens the PDF viewer instead of printing the page", async () => {
    URL.createObjectURL = vi.fn(() => "blob:terms")
    URL.revokeObjectURL = vi.fn()
    await openPage()
    fireEvent.click(screen.getByRole("button", { name: "Export PDF" }))
    const dialog = await screen.findByRole("dialog", { name: /Preview: Academic terms/ })
    expect(await within(dialog).findByRole("link", { name: "Download PDF" })).toBeDefined()
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeDefined()
  })
})
