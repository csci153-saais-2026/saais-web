import { afterEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import CurriculaPage from "./CurriculaPage"

afterEach(cleanup)

describe("Curricula Builder preview", () => {
  it("renders version selector, 4-stat summary, and positional term panels", () => {
    render(
      <MemoryRouter>
        <CurriculaPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Shape the path to graduation." })).toBeDefined()
    expect(screen.getAllByText("Required units")).toHaveLength(3)
    expect(screen.getByText("Enrolled students")).toBeDefined()
    expect(screen.getByText("Effective from")).toBeDefined()
    expect(screen.getByText("1 Jun 2023")).toBeDefined()
    expect(screen.getByText("Status")).toBeDefined()
    expect(screen.getByText("Year 1 · Semester 1")).toBeDefined()
    expect(screen.getByText("Year 1 · Semester 2")).toBeDefined()
    expect(screen.getByText("CSIT 100 — Introduction to Computing")).toBeDefined()
    expect(screen.getByText("GE elective")).toBeDefined()
  })

  it("opens Add version and New course dialogs", () => {
    render(
      <MemoryRouter>
        <CurriculaPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button", { name: /Add version/i }))
    expect(screen.getByRole("heading", { name: "Add version" })).toBeDefined()
    expect(screen.getByLabelText(/Academic year/i)).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByRole("button", { name: /New course/i }))
    expect(screen.getByRole("heading", { name: "New course" })).toBeDefined()
    expect(screen.getByLabelText(/Course code/i)).toBeDefined()
  })
})
