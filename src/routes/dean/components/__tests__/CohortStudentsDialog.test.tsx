import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CohortStudentsDialog } from "@/routes/dean/components/CohortStudentsDialog"

describe("CohortStudentsDialog", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders cohort student rows, audit notice, and triggers student drill-down", () => {
    const onOpenChange = vi.fn()
    const onOpenStudent = vi.fn()

    render(
      <CohortStudentsDialog
        batch={{
          batch: "2023",
          curriculum: "BSCS 2025–present",
          students: 96,
          meanGwa: "2.02",
        }}
        students={[
          { studentNumber: "23-1-01234", name: "Ana Reyes", gwa: "1.72" },
          { studentNumber: "23-1-01301", name: "Ben Lopez", gwa: "2.10" },
        ]}
        open
        onOpenChange={onOpenChange}
        onOpenStudent={onOpenStudent}
      />,
    )

    expect(screen.getByText("Students behind this number")).toBeTruthy()
    expect(
      screen.getByText("Opening this list is recorded in the audit log."),
    ).toBeTruthy()
    expect(screen.getByText("Batch 2023 · BSCS 2025–present (96 students)")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Ana Reyes" }))
    expect(onOpenStudent).toHaveBeenCalledWith("23-1-01234")
  })
})
