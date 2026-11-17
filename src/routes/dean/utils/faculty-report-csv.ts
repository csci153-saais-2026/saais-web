import type { FacultyDepartmentReport } from "@/routes/dean/types"

function escapeCsvCell(value: string | number): string {
  const raw = String(value)
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  if (/[",\r\n]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }
  return neutralized
}

function toCsvRow(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(",")
}

export function buildFacultyReportCsvFilename(
  department: FacultyDepartmentReport["department"],
): string {
  if (department === "All departments") {
    return "SAAIS-faculty-reports.csv"
  }
  const slug = department
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `SAAIS-faculty-reports-${slug}.csv`
}

export function buildFacultyReportCsv(
  report: FacultyDepartmentReport,
): string {
  const rows: string[] = [
    toCsvRow(["Faculty Report", report.department]),
    toCsvRow(["Metric", "Value"]),
    toCsvRow(["Students", report.students]),
    toCsvRow(["Mean GWA", report.meanGwa]),
    toCsvRow(["With deficiencies", report.withDeficiencies]),
    "",
    toCsvRow(["Grade range", "Share (%)"]),
    ...report.bands.map((band) => toCsvRow([band.label, band.percent])),
    "",
    toCsvRow(["Batch", "Curriculum", "Students", "Mean GWA"]),
    ...report.batchRows.map((row) =>
      toCsvRow([row.batch, row.curriculum, row.students, row.meanGwa]),
    ),
  ]

  return rows.join("\r\n") + "\r\n"
}

export function downloadFacultyReportCsv(
  report: FacultyDepartmentReport,
): string {
  const filename = buildFacultyReportCsvFilename(report.department)
  const csv = buildFacultyReportCsv(report)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return filename
}

