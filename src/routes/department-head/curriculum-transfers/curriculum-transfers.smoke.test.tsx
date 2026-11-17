import { describe, expect, it } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
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
  })
})
