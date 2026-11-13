import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import CurriculumTransfersPage from "./CurriculumTransfersPage"

afterEach(cleanup)

describe("Curriculum Transfers preview", () => {
  it("renders stat metrics and pending requests", () => {
    render(
      <MemoryRouter>
        <CurriculumTransfersPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Pending review")).toBeDefined()
    expect(screen.getByText("Approved this semester")).toBeDefined()
    expect(screen.getByText("Transfer requests")).toBeDefined()
    expect(screen.getByText("Luis Miguel Cruz")).toBeDefined()
    expect(screen.getByText("23-1-00218")).toBeDefined()
  })

  it("supports ?history=1 tab selection and review dialog validation", () => {
    render(
      <MemoryRouter initialEntries={["/department-head/curriculum-transfers?history=1"]}>
        <CurriculumTransfersPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Transfer decision history")).toBeDefined()
    expect(screen.getByText("Maria Lopez")).toBeDefined()

    const pendingTab = screen.getByRole("tab", { name: /Pending review/i })
    fireEvent.mouseDown(pendingTab, { button: 0 })
    fireEvent.click(pendingTab)
    const reviewButtons = screen.getAllByRole("button", { name: /Review request →/i })
    fireEvent.click(reviewButtons[0])

    expect(screen.getByRole("heading", { name: "Review curriculum transfer" })).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: /Reject request/i }))
    expect(screen.getByText(/Add a decision reason to reject/i)).toBeDefined()
  })
})
