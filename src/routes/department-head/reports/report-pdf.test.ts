import { describe, expect, it } from "vitest"
import { createReportPdf, reportPdfFilename } from "./report-pdf"
import { ALL_PROGRAMS, buildDepartmentReport, getCohortStudents, type ReportStudent } from "./report-model"

const student = (index: number, overrides: Partial<ReportStudent> = {}): ReportStudent => ({
  id: `student-${index}`, name: `Student ${index}`, studentNumber: `25-1-${String(index).padStart(5, "0")}`,
  programCode: "BSCS", programName: "BS Computer Science", curriculum: "BSCS 2024", entryYear: 2025,
  gwa: 1.5 + (index % 5) * 0.25, deficiencies: index % 4 === 0 ? 1 : 0, ...overrides,
})

const students = [
  ...Array.from({ length: 7 }, (_, index) => student(index + 1)),
  student(8, { programCode: "BSIT", programName: "BS Information Technology", curriculum: "BSIT 2024", entryYear: 2024, gwa: null }),
  student(9, { programCode: "BSIT", programName: "BS Information Technology", curriculum: "BSIT 2024", entryYear: 2024, gwa: 2.75 }),
]

function report(programKey = ALL_PROGRAMS) {
  return buildDepartmentReport({ students, currentCurricula: new Set(["BSCS 2024", "BSIT 2024"]), termId: "term-1", termLabel: "AY 2025–2026 · 1st semester", programKey })
}

describe("department report model", () => {
  it("summarises the selected program from the student list", () => {
    const bsit = report("BSIT")
    expect(bsit.enrolled).toBe(2)
    expect(bsit.meanGwa).toBe("2.75")
    expect(bsit.gwaStudents).toBe(1)
    expect(bsit.programLabel).toBe("BS Information Technology")
    expect(bsit.curricula).toEqual([{ name: "BSIT 2024", status: "Current", students: 2 }])
    expect(report().enrolmentNote).toBe("BSCS 7 · BSIT 2")
  })

  it("keeps displayed percentages and counts equal to the totals", () => {
    const full = report()
    expect(full.distribution.reduce((total, band) => total + band.percent, 0)).toBe(100)
    expect(full.distribution.reduce((total, band) => total + band.count, 0)).toBe(full.enrolled)
  })

  it("lists each cohort's own students", () => {
    const [cohort] = report("BSIT").cohorts
    const members = getCohortStudents(students, cohort)
    expect(members.map((member) => member.studentNumber)).toEqual(["25-1-00008", "25-1-00009"])
    expect(members.map((member) => member.gwa)).toEqual(["—", "2.75"])
  })
})

describe("department report PDF", () => {
  it("exports selected program data with searchable text and correct byte offsets", () => {
    const selected = report("BSIT")
    const bytes = createReportPdf(selected)
    const text = new TextDecoder().decode(bytes)
    expect(text.startsWith("%PDF-1.4")).toBe(true)
    expect(text).toContain("AY 2025-2026 | 1st semester")
    expect(text).toContain("BS Information Technology")
    expect(text).toContain("Currently enrolled: 2")
    expect(text).not.toContain("BSCS 2024")
    expect(text).toContain("GWA by batch and curriculum")
    const xrefOffset = Number(/startxref\n(\d+)/.exec(text)![1])
    expect(new TextDecoder().decode(bytes.slice(xrefOffset, xrefOffset + 4))).toBe("xref")
    const entries = [...text.matchAll(/(\d{10}) 00000 n /g)]
    entries.forEach((entry, index) => {
      const offset = Number(entry[1])
      expect(text.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true)
    })
    expect(reportPdfFilename(selected)).toBe("SAAIS-department-report-term-1-BSIT.pdf")
  })

  it("paginates long cohort tables without dropping the final row", () => {
    const long = report()
    long.cohorts = Array.from({ length: 60 }, (_, index) => ({ ...long.cohorts[0], id: `cohort-${index}`, curriculum: index === 59 ? "LAST COHORT" : `Curriculum ${index}` }))
    const text = new TextDecoder().decode(createReportPdf(long))
    const pageCount = Number(/\/Type \/Pages .*?\/Count (\d+)/.exec(text)![1])
    expect(pageCount).toBeGreaterThan(2)
    expect(text).toContain("LAST COHORT")
    expect(text).toContain(`Page ${pageCount} of ${pageCount}`)
    expect(text.split("GWA by batch and curriculum").length - 1).toBeGreaterThan(1)
  })

  it("escapes PDF text syntax and rejects unsupported scripts instead of silently deleting them", () => {
    const selected = report()
    selected.programLabel = "Program (A) \\ term"
    expect(new TextDecoder().decode(createReportPdf(selected))).toContain("Program \\(A\\) \\\\ term")
    selected.programLabel = "計算機"
    expect(() => createReportPdf(selected)).toThrow("PDF font")
  })
})
