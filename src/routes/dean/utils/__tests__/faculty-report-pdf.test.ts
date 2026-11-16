import { describe, expect, it } from "vitest"
import { FACULTY_REPORTS } from "@/routes/dean/data/faculty-reports"
import {
  buildFacultyReportFilename,
  buildFacultyReportPdfLines,
  generateFacultyReportPdfBytes,
} from "@/routes/dean/utils/faculty-report-pdf"

describe("faculty-report-pdf", () => {
  it("builds filenames matching the mockup convention", () => {
    expect(buildFacultyReportFilename("All departments")).toBe("SAAIS-faculty-reports.pdf")
    expect(buildFacultyReportFilename("DCST")).toBe("SAAIS-faculty-reports-dcst.pdf")
    expect(buildFacultyReportFilename("DIT Alang-alang")).toBe(
      "SAAIS-faculty-reports-dit-alang-alang.pdf",
    )
    expect(buildFacultyReportFilename("DIT Isabel")).toBe("SAAIS-faculty-reports-dit-isabel.pdf")
  })

  it("formats report summary, grade distribution, and batch GWA rows into lines", () => {
    const lines = buildFacultyReportPdfLines(FACULTY_REPORTS.DCST, "Dr. Paz Villanueva")
    const joined = lines.join("\n")

    expect(joined).toContain("SAAIS - Office of the Dean | Faculty Reports")
    expect(joined).toContain("Faculty of Computing | DCST | read-only")
    expect(joined).toContain("Students:          212")
    expect(joined).toContain("Mean GWA:          1.92")
    expect(joined).toContain("With deficiencies: 38")
    expect(joined).toContain("1.00-1.50")
    expect(joined).toContain("36%")
    expect(joined).toContain("BSCS 2025-present")
  })

  it("generates a valid PDF 1.4 header, xref table, and EOF marker", () => {
    const bytes = generateFacultyReportPdfBytes(FACULTY_REPORTS["All departments"])
    const raw = new TextDecoder().decode(bytes)

    expect(raw.startsWith("%PDF-1.4\n")).toBe(true)
    expect(raw).toContain("xref\n0 6\n")
    expect(raw).toContain("trailer\n<< /Size 6 /Root 1 0 R >>")
    expect(raw.trimEnd().endsWith("%%EOF")).toBe(true)
    expect(raw).toContain("Faculty of Computing | All departments | read-only")
  })
})
