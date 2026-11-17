import { describe, expect, it } from "vitest"
import type { FacultyDepartmentReport } from "@/routes/dean/types"
import {
  buildFacultyReportCsv,
  buildFacultyReportCsvFilename,
} from "@/routes/dean/utils/faculty-report-csv"

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

describe("faculty-report-csv", () => {
  it("builds CSV filenames matching the department slug convention", () => {
    expect(buildFacultyReportCsvFilename("All departments")).toBe(
      "SAAIS-faculty-reports.csv",
    )
    expect(buildFacultyReportCsvFilename("DCST")).toBe(
      "SAAIS-faculty-reports-dcst.csv",
    )
    expect(buildFacultyReportCsvFilename("DIT Alang-alang")).toBe(
      "SAAIS-faculty-reports-dit-alang-alang.csv",
    )
  })

  it("formats metrics, grade distribution, and batch GWA rows into RFC-4180 CSV", () => {
    const csv = buildFacultyReportCsv(SAMPLE_REPORT)
    expect(csv).toContain("Faculty Report,DCST\r\n")
    expect(csv).toContain("Students,42\r\n")
    expect(csv).toContain("Mean GWA,1.85\r\n")
    expect(csv).toContain("Grade range,Share (%)\r\n")
    expect(csv).toContain("1.00–1.50,40\r\n")
    expect(csv).toContain("Batch,Curriculum,Students,Mean GWA\r\n")
    expect(csv).toContain("2024,BSCS 2024,42,1.85\r\n")
  })
})
