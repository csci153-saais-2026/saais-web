import { describe, expect, it } from "vitest"
import { createReportPdf, reportPdfFilename } from "./report-pdf"
import { getCohortStudents, getDepartmentReport, REPORT_PROGRAMS, REPORT_TERMS } from "./reports-data"

describe("department report PDF", () => {
  it("exports selected program data with searchable text and correct byte offsets", () => {
    const report = getDepartmentReport("2024-2025-2", "bsit")!
    const bytes = createReportPdf(report)
    const text = new TextDecoder().decode(bytes)
    expect(text.startsWith("%PDF-1.4")).toBe(true)
    expect(text).toContain("AY 2024-2025 | 2nd semester")
    expect(text).toContain("BS Information Technology")
    expect(text).toContain("Currently enrolled: 173")
    expect(text).not.toContain("BSCS 2021")
    expect(text).toContain("GWA by batch and curriculum")
    const xrefOffset = Number(/startxref\n(\d+)/.exec(text)![1])
    expect(new TextDecoder().decode(bytes.slice(xrefOffset, xrefOffset + 4))).toBe("xref")
    const entries = [...text.matchAll(/(\d{10}) 00000 n /g)]
    entries.forEach((entry, index) => {
      const offset = Number(entry[1])
      expect(text.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true)
    })
    expect(reportPdfFilename(report)).toBe("SAAIS-department-report-2024-2025-2-bsit.pdf")
  })

  it("paginates long cohort tables without dropping the final row", () => {
    const report = getDepartmentReport("2025-2026-1", "all")!
    report.cohorts = Array.from({ length: 60 }, (_, index) => ({ ...report.cohorts[0], id: `cohort-${index}`, curriculum: index === 59 ? "LAST COHORT" : `Sample curriculum ${index}` }))
    const text = new TextDecoder().decode(createReportPdf(report))
    const pageCount = Number(/\/Type \/Pages .*?\/Count (\d+)/.exec(text)![1])
    expect(pageCount).toBeGreaterThan(2)
    expect(text).toContain("LAST COHORT")
    expect(text).toContain(`Page ${pageCount} of ${pageCount}`)
    expect(text.split("GWA by batch and curriculum").length - 1).toBeGreaterThan(1)
  })

  it("preserves every fixture's total grade record count across displayed categories", () => {
    for (const term of REPORT_TERMS.slice(0, 2)) {
      for (const program of REPORT_PROGRAMS) {
        const report = getDepartmentReport(term.value, program.value)!
        expect(report.distribution.reduce((total, band) => total + band.percent, 0)).toBe(100)
        expect(report.distribution.reduce((total, band) => total + band.count, 0)).toBe(report.gradeRecords)
      }
    }
  })

  it("gives different programs distinct fictional student identifiers", () => {
    const report = getDepartmentReport("2025-2026-1", "all")!
    const students = report.cohorts.flatMap(getCohortStudents)
    expect(new Set(students.map((student) => student.studentNumber)).size).toBe(students.length)
  })

  it("escapes PDF text syntax and rejects unsupported scripts instead of silently deleting them", () => {
    const report = getDepartmentReport("2025-2026-1", "all")!
    report.programLabel = "Program (demo) \\ term"
    expect(new TextDecoder().decode(createReportPdf(report))).toContain("Program \\(demo\\) \\\\ term")
    report.programLabel = "計算機"
    expect(() => createReportPdf(report)).toThrow("sample PDF font")
  })
})
