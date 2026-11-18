import { describe, expect, it } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { delay, http, HttpResponse } from "msw"
import { getMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
import CurriculumTransfersPage from "./CurriculumTransfersPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()

const route = "/department-head/curriculum-transfers"

describe("Curriculum Transfers", () => {
  it("renders stat metrics and the pending request from the API", async () => {
    renderDepartmentHead(<CurriculumTransfersPage />, route)
    expect(await screen.findByText("Sta. Agata, Jerome Daniel S.")).toBeDefined()
    expect(screen.getByText("Pending review")).toBeDefined()
    expect(screen.getByText("Transfer requests")).toBeDefined()
    expect(screen.getByText("24-1-01798")).toBeDefined()
    expect(screen.getByText("Pending review (1)")).toBeDefined()
    const db = getMockDatabase()
    const endorser = db.profiles.find(row => row.id === db.curriculumTransferRequests[0].endorsed_by)!
    expect(screen.getByText(endorser.full_name)).toBeDefined()
  })

  it("requires a reason to reject, then records the decision in the history", async () => {
    renderDepartmentHead(<CurriculumTransfersPage />, route)
    fireEvent.click(await screen.findByRole("button", { name: /Review request →/i }))
    expect(screen.getByRole("heading", { name: "Review curriculum transfer" })).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: /Reject request/i }))
    expect(screen.getByText(/Add a decision reason to reject/i)).toBeDefined()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Pending review of required equivalencies." } })
    fireEvent.click(screen.getByRole("button", { name: /Reject request/i }))
    expect(await screen.findByText("Request for Sta. Agata, Jerome Daniel S. rejected.")).toBeDefined()
    await waitFor(() => expect(screen.getByText("Pending review (0)")).toBeDefined())
    expect(screen.getByText("Decision history (1)")).toBeDefined()
  })

  it("supports ?history=1 tab selection", async () => {
    renderDepartmentHead(<CurriculumTransfersPage />, `${route}?history=1`)
    expect(await screen.findByText("Transfer decision history")).toBeDefined()
    expect(screen.getByText("Decision history (0)")).toBeDefined()
    expect(screen.getByText("No transfer decisions have been recorded.")).toBeDefined()
  })

  it("approves the selected request and shows it in history after refetch", async () => {
    renderDepartmentHead(<CurriculumTransfersPage />, route)
    fireEvent.click(await screen.findByRole("button", { name: /Review request/ }))
    fireEvent.click(screen.getByRole("button", { name: "Approve request" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Decision history (1)" }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole("cell", { name: /Approved/ })).toBeDefined()
    expect(screen.getByText("Sta. Agata, Jerome Daniel S.")).toBeDefined()
  })

  it("disables decisions while saving and retains the dialog after an API failure", async () => {
    let writes = 0
    saaisMockServer.use(http.post("*/functions/v1/curriculum-transfers/:id/decision", async () => {
      writes++
      await delay(250)
      return HttpResponse.json({ code: "CONFLICT", message: "Decision could not be saved." }, { status: 409 })
    }))
    renderDepartmentHead(<CurriculumTransfersPage />, route)
    fireEvent.click(await screen.findByRole("button", { name: /Review request/ }))
    const dialog = within(screen.getByRole("dialog"))
    fireEvent.click(dialog.getByRole("button", { name: "Approve request" }))
    await waitFor(() => expect(dialog.getByRole("button", { name: "Reject request" })).toHaveProperty("disabled", true))
    fireEvent.click(dialog.getByRole("button", { name: "Approve request" }))
    expect(await dialog.findByRole("alert")).toHaveProperty("textContent", "Decision could not be saved.")
    expect(writes).toBe(1)
    expect(screen.getByText("Pending review (1)")).toBeDefined()
  })

  it("shows loading, a failed read, and a successful retry", async () => {
    const handler = http.get("*/rest/v1/curriculum_transfer_request", async () => {
      await delay(50)
      return HttpResponse.json({ code: "UNAVAILABLE", message: "Try later." }, { status: 500 })
    })
    saaisMockServer.use(handler)
    renderDepartmentHead(<CurriculumTransfersPage />, route)
    expect(screen.getByRole("status").textContent).toContain("Loading curriculum transfers")
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Try later."))
    saaisMockServer.resetHandlers()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByRole("button", { name: /Review request/ })).toBeDefined()
  })

  it("reads transfer requests beyond the first 100 rows", async () => {
    const db = getMockDatabase()
    const source = db.curriculumTransferRequests[0]
    db.curriculumTransferRequests = Array.from({ length: 101 }, (_, index) => ({ ...source, id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}` }))
    renderDepartmentHead(<CurriculumTransfersPage />, route)
    expect(await screen.findByText("Pending review (101)")).toBeDefined()
    expect(screen.getAllByRole("button", { name: /Review request/ })).toHaveLength(101)
  })
})
