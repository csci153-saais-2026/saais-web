import { describe, expect, it } from "vitest"
import { FACULTY_REPORTS } from "@/routes/dean/data/faculty-reports"
import {
  buildFacultyReportCsv,
  buildFacultyReportCsvFilename,
} from "@/routes/dean/utils/faculty-report-csv"

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
    const csv = buildFacultyReportCsv(FACULTY_REPORTS.DCST)
    expect(csv).toContain("Faculty Report,DCST\r\n")
    expect(csv).toContain("Students,212\r\n")
    expect(csv).toContain("Mean GWA,1.92\r\n")
    expect(csv).toContain("Grade range,Share (%)\r\n")
    expect(csv).toContain("1.00–1.50,36\r\n")
    expect(csv).toContain("Batch,Curriculum,Students,Mean GWA\r\n")
    expect(csv).toContain("2023,BSCS 2025–present,58,1.96\r\n")
  })
})

