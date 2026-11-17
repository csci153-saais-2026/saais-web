import { describe, expect, it } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import OutsideCreditsPage from "./OutsideCreditsPage"
import { renderDepartmentHead, setupDepartmentHeadMockApi } from "../test-utils"

setupDepartmentHeadMockApi()

describe("Outside Credits", () => {
  it("renders outside credit metrics, student entries and the footer count from the API", async () => {
    renderDepartmentHead(<OutsideCreditsPage />)
    expect(await screen.findByText("Sta. Agata, Jerome Daniel S.")).toBeDefined()
    expect(screen.getByText("Credited subjects")).toBeDefined()
    expect(screen.getByText("Students with outside credits")).toBeDefined()
    expect(screen.getByText("University of the Philippines Cebu")).toBeDefined()
    expect(screen.getByText("1 credited subject")).toBeDefined()
  })

  it("opens the Credit a course dialog", async () => {
    renderDepartmentHead(<OutsideCreditsPage />)
    await screen.findByText("1 credited subject")
    fireEvent.click(screen.getByRole("button", { name: /Credit a course/i }))
    expect(screen.getByRole("heading", { name: "Credit an outside course" })).toBeDefined()
    expect(screen.getByLabelText(/Original course code/i)).toBeDefined()
  })
})
