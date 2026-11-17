import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { DeanStudentChecklistTab } from "@/routes/dean/components/DeanStudentChecklistTab"
import { getDeanStudentDetail } from "@/routes/dean/data/faculty-students"

describe("DeanStudentChecklistTab", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders degree progress, term groups, and opens read-only Course Info modal", async () => {
    const student = getDeanStudentDetail("23-1-01234")!
    render(<DeanStudentChecklistTab student={student} />)

    expect(screen.getByText("78 units earned")).toBeTruthy()
    expect(screen.getByText("Year 1 · Semester 1")).toBeTruthy()
    expect(screen.getByText("Introduction to Computing")).toBeTruthy()

    const infoButtons = screen.getAllByRole("button", { name: "Course info" })
    fireEvent.click(infoButtons[0])

    expect(
      await screen.findByText("CSci 11 · Introduction to Computing"),
    ).toBeTruthy()
    expect(screen.getByText("3 units · Prerequisites: None")).toBeTruthy()

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0])
  })
})
