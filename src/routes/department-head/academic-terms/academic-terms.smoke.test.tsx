import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import AcademicTermsPage from "./AcademicTermsPage"

afterEach(cleanup)

describe("Academic Terms preview", () => {
  it("renders advisory banner, terms schedule, and term counts without extra stat cards", () => {
    render(
      <MemoryRouter>
        <AcademicTermsPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Closing encoding prevents further grade entry/i)).toBeDefined()
    expect(screen.queryByText("Active term")).toBeNull()
    expect(screen.getAllByText("2025–2026").length).toBeGreaterThan(0)
    expect(screen.getByText("04 Aug – 19 Dec 2025")).toBeDefined()
    expect(screen.getByText("1 open term · 3 closed terms")).toBeDefined()
    expect(screen.getByRole("button", { name: /Close encoding/i })).toBeDefined()
  })

  it("opens Close grade encoding confirmation dialog", () => {
    render(
      <MemoryRouter>
        <AcademicTermsPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /Close encoding/i }))
    expect(screen.getByRole("heading", { name: "Close grade encoding" })).toBeDefined()
    expect(screen.getByText(/New grade entries will be closed for this term/i)).toBeDefined()
  })
})
