import { describe, expect, it } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import { delay, http, HttpResponse } from "msw"
import { getMockDatabase } from "@/mocks"
import { saaisMockServer } from "@/mocks/node"
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

  it("shows an explicit empty state", async () => {
    getMockDatabase().outsideCredits = []
    renderDepartmentHead(<OutsideCreditsPage />)
    expect(await screen.findByText("No outside credits have been recorded.")).toBeDefined()
    expect(screen.getByText("0 credited subjects")).toBeDefined()
  })

  it("shows loading and allows a failed API read to be retried", async () => {
    saaisMockServer.use(http.get("*/rest/v1/outside_credit", async () => {
      await delay(50)
      return HttpResponse.json({ code: "UNAVAILABLE", message: "Credits unavailable." }, { status: 500 })
    }))
    renderDepartmentHead(<OutsideCreditsPage />)
    expect(screen.getByRole("status").textContent).toContain("Loading outside credits")
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Credits unavailable."))
    saaisMockServer.resetHandlers()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("1 credited subject")).toBeDefined()
  })

  it("reads outside credits beyond the first 100 rows", async () => {
    const db = getMockDatabase()
    const source = db.outsideCredits[0]
    db.outsideCredits = Array.from({ length: 101 }, (_, index) => ({ ...source, id: `91000000-0000-4000-8000-${String(index).padStart(12, "0")}` }))
    renderDepartmentHead(<OutsideCreditsPage />)
    expect(await screen.findByText("101 credited subjects")).toBeDefined()
  })
})
