import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FacultyAuditFilters } from "@/routes/dean/components/FacultyAuditFilters"

describe("FacultyAuditFilters", () => {
  afterEach(() => {
    cleanup()
  })

  it("handles person, student, and date inputs and enables Clear", () => {
    const onPersonChange = vi.fn()
    const onStudentChange = vi.fn()
    const onFromDateChange = vi.fn()
    const onReset = vi.fn()

    render(
      <FacultyAuditFilters
        person="Paz"
        onPersonChange={onPersonChange}
        student=""
        onStudentChange={onStudentChange}
        action="all"
        onActionChange={vi.fn()}
        fromDate=""
        onFromDateChange={onFromDateChange}
        onReset={onReset}
      />,
    )

    fireEvent.change(screen.getByLabelText("Student"), {
      target: { value: "Ana" },
    })
    expect(onStudentChange).toHaveBeenCalledWith("Ana")

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-10-14" },
    })
    expect(onFromDateChange).toHaveBeenCalledWith("2026-10-14")

    const clearButton = screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement
    expect(clearButton.disabled).toBe(false)
    fireEvent.click(clearButton)
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})

