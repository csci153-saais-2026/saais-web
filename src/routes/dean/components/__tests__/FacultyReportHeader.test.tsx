import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FacultyReportHeader } from "@/routes/dean/components/FacultyReportHeader"

describe("FacultyReportHeader", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders Reports heading, faculty subtitle, and triggers PDF export without CSV", () => {
    const onDepartmentChange = vi.fn()
    const onExportPdf = vi.fn()

    render(
      <FacultyReportHeader
        facultyName="Faculty of Computing"
        department="DCST"
        onDepartmentChange={onDepartmentChange}
        onExportPdf={onExportPdf}
      />,
    )

    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy()
    expect(screen.getByText("Faculty of Computing · DCST · read-only")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }))
    expect(onExportPdf).toHaveBeenCalledTimes(1)
  })
})
