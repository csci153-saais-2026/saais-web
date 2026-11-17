import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FacultyReportHeader } from "@/routes/dean/components/FacultyReportHeader"

describe("FacultyReportHeader", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders scope subtitle and triggers PDF and CSV export callbacks", () => {
    const onDepartmentChange = vi.fn()
    const onExportPdf = vi.fn()
    const onExportCsv = vi.fn()

    render(
      <FacultyReportHeader
        department="DCST"
        onDepartmentChange={onDepartmentChange}
        onExportPdf={onExportPdf}
        onExportCsv={onExportCsv}
      />,
    )

    expect(screen.getByText("Faculty of Computing · DCST · read-only")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }))
    expect(onExportPdf).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }))
    expect(onExportCsv).toHaveBeenCalledTimes(1)
  })
})

