import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import OutsideCreditsPage from "./OutsideCreditsPage"

afterEach(cleanup)

describe("Outside Credits preview", () => {
  it("renders outside credit metrics, student entries, and sample footer count", () => {
    render(
      <MemoryRouter>
        <OutsideCreditsPage />
      </MemoryRouter>
    )

    expect(screen.getByText("Credited subjects")).toBeDefined()
    expect(screen.getByText("Students with outside credits")).toBeDefined()
    expect(screen.getByText("Ana Marie Santos")).toBeDefined()
    expect(screen.getByText("Northern State College")).toBeDefined()
    expect(screen.getByText("Showing 4 sample records of 28 credited subjects")).toBeDefined()
  })

  it("opens Credit a course modal", () => {
    render(
      <MemoryRouter>
        <OutsideCreditsPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /Credit a course/i }))
    expect(screen.getByRole("heading", { name: "Credit an outside course" })).toBeDefined()
    expect(screen.getByLabelText(/Original course code/i)).toBeDefined()
  })
})
