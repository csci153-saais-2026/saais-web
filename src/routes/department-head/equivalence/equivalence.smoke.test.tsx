import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import EquivalencePage from "./EquivalencePage"

afterEach(cleanup)

describe("Course Equivalence preview", () => {
  it("renders policy alert and course equivalencies table", () => {
    render(
      <MemoryRouter>
        <EquivalencePage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Equivalencies apply to a curriculum pair/i)).toBeDefined()
    expect(screen.getAllByText("CS 101").length).toBeGreaterThan(0)
    expect(screen.getAllByText("CC 101").length).toBeGreaterThan(0)
    expect(screen.getAllByText("BSCS 2021 → BSCS 2024").length).toBeGreaterThan(0)
  })

  it("opens Add course equivalence modal", () => {
    render(
      <MemoryRouter>
        <EquivalencePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /Add course equivalence/i }))
    expect(screen.getByRole("heading", { name: "Add course equivalence" })).toBeDefined()
    expect(screen.getByLabelText(/Old course subject/i)).toBeDefined()
    expect(screen.getByLabelText(/Equivalent course subject/i)).toBeDefined()
  })
})
