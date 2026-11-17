import { describe, expect, it } from "vitest"
import type { FacultyDepartmentReport } from "@/routes/dean/types"
import {
  buildFacultyReportFilename,
  buildFacultyReportPdfLines,
} from "@/routes/dean/utils/faculty-report-pdf"

const SAMPLE_REPORT: FacultyDepartmentReport = {
  department: "DCST",
  students: 42,
  meanGwa: "1.85",
  withDeficiencies: 5,
  bands: [
    { label: "1.00–1.50", percent: 40, tone: "primary" },
    { label: "1.75–2.25", percent: 45, tone: "soft" },
  ],
  batchRows: [
    { batch: "2024", curriculum: "BSCS 2024", students: 42, meanGwa: "1.85" },
  ],
  cohortSamples: {},
}

describe("faculty-report-pdf", () => {
  it("builds filenames matching the mockup convention", () => {
    expect(buildFacultyReportFilename("All departments")).toBe("SAAIS-faculty-reports.pdf")
    expect(buildFacultyReportFilename("DCST")).toBe("SAAIS-faculty-reports-dcst.pdf")
    expect(buildFacultyReportFilename("DIT Alang-alang")).toBe(
      "SAAIS-faculty-reports-dit-alang-alang.pdf",
    )
  })

  it("formats report summary, grade distribution, and batch GWA rows into lines", () => {
    const lines = buildFacultyReportPdfLines(SAMPLE_REPORT, "Dr. Paz Villanueva")
    const joined = lines.join("\n")

    expect(joined).toContain("SAAIS - Office of the Dean | Faculty Reports")
    expect(joined).toContain("Faculty of Computing | DCST | read-only")
    expect(joined).toContain("Students: 42 | Mean GWA: 1.85 | With deficiencies: 5")
    expect(joined).toContain("1.00–1.50: 40%")
    expect(joined).toContain("2024 | BSCS 2024 | 42 | 1.85")
  })
})
