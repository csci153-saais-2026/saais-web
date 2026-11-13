import type { DepartmentReport } from "./reports-data"

// Adapted from the pagination/text/table approach in the project's
// mockup/Department Head/pdf-export.js. This report uses searchable standard PDF
// fonts and no embedded images, remote services or additional dependencies.
function printable(value: string | number): string {
  const text = String(value)
    .replace(/[–—]/g, "-").replace(/·/g, " | ").replace(/→/g, "->")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\u00a0/g, " ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  if (/[^\x20-\x7e\n\r\t]/.test(text)) throw new Error("The sample PDF font cannot represent some report text.")
  return text.replace(/\s+/g, " ").trim()
}

function escapePdf(value: string): string {
  return value.replace(/([\\()])/g, "\\$1")
}

function wrap(value: string | number, capacity: number): string[] {
  const words = printable(value).split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const pieces = word.match(new RegExp(`.{1,${capacity}}`, "g")) ?? [""]
    for (const piece of pieces) {
      if (line && line.length + piece.length + 1 > capacity) { lines.push(line); line = "" }
      line += `${line ? " " : ""}${piece}`
    }
  }
  if (line || lines.length === 0) lines.push(line)
  return lines
}

/** Creates a local sample PDF containing the currently selected report, including all cohort rows. */
export function createReportPdf(report: DepartmentReport): Uint8Array {
  const width = 595, height = 842, margin = 40, bodyWidth = width - margin * 2
  const pages: string[][] = []
  let commands: string[] = []
  let y = 0

  function text(value: string | number, x: number, top: number, size = 10, bold = false, colour = "0.086 0.125 0.047") {
    commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${colour} rg 1 0 0 1 ${x.toFixed(2)} ${(height - top).toFixed(2)} Tm (${escapePdf(printable(value))}) Tj ET`)
  }
  function rect(x: number, top: number, w: number, h: number, colour: string) {
    commands.push(`${colour} rg ${x.toFixed(2)} ${(height - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`)
  }
  function newPage() {
    commands = []
    pages.push(commands)
    text("SAAIS | Department reports", margin, 43, 18, true)
    text("Department of Computer Science and Technology", margin, 61, 10)
    text(report.termLabel, margin, 79, 10, true)
    text(report.programLabel, margin, 95, 10)
    y = 120
  }
  function ensure(space: number) {
    if (y + space <= height - 55) return false
    newPage()
    return true
  }
  function paragraph(value: string, bold = false, size = 10) {
    for (const line of wrap(value, Math.floor(bodyWidth / (size * 0.58)))) {
      ensure(size + 6)
      text(line, margin, y, size, bold)
      y += size + 5
    }
    y += 6
  }
  function table(title: string, headers: string[], rows: (string | number)[][], weights: number[]) {
    ensure(85)
    paragraph(title, true, 13)
    const totalWeight = weights.reduce((total, weight) => total + weight, 0)
    const widths = weights.map((weight) => bodyWidth * weight / totalWeight)
    const capacities = widths.map((columnWidth) => Math.max(6, Math.floor((columnWidth - 14) / 5.5)))
    function row(values: (string | number)[], header: boolean, index: number) {
      const lines = headers.map((_, column) => wrap(values[column] ?? "-", capacities[column]))
      const rowHeight = Math.max(...lines.map((column) => column.length)) * 13 + 8
      if (!header && ensure(rowHeight)) {
        paragraph(`${title} (continued)`, true, 13)
        row(headers, true, 0)
      }
      rect(margin, y - 11, bodyWidth, rowHeight, header ? "0.184 0.290 0.071" : index % 2 ? "0.984 0.973 0.937" : "1 1 1")
      let x = margin
      lines.forEach((column, columnIndex) => {
        column.forEach((line, lineIndex) => text(line, x + 7, y + 2 + lineIndex * 13, 9.5, header, header ? "0.984 0.973 0.937" : "0.086 0.125 0.047"))
        x += widths[columnIndex]
      })
      y += rowHeight
    }
    row(headers, true, 0)
    rows.forEach((values, index) => row(values, false, index))
    y += 14
  }

  newPage()
  paragraph("Fictional sample report | Academic snapshot: 15 August 2025", false, 9)
  paragraph(`Currently enrolled: ${report.enrolled.toLocaleString("en-US")} | ${report.enrolmentNote}`, true)
  paragraph(`Mean GWA: ${report.meanGwa} | Students with deficiencies: ${report.deficiencies}`, true)
  table("Final grade distribution", ["Grade range", "Percent", "Grade records"], report.distribution.map((band) => [band.label, `${band.percent}%`, band.count]), [2, 1, 1.5])
  paragraph(`${report.gradeRecords.toLocaleString("en-US")} course grade records. INC, DR and NA are excluded from this sample mean GWA.`, false, 9)
  table("Department curriculum summary", ["Curriculum", "Status", "Students"], report.curricula.map((curriculum) => [curriculum.name, curriculum.status, curriculum.students]), [2, 1, 1])
  table("GWA by batch and curriculum", ["Entry year", "Study range", "Curriculum", "Students", "Mean GWA"], report.cohorts.map((cohort) => [cohort.entryYear, `${cohort.entryYear}-${cohort.entryYear + 4}`, cohort.curriculum, cohort.students, cohort.meanGwa]), [1, 1.5, 1.5, 1, 1])
  paragraph("Cohorts are illustrative examples, not a complete reconciliation of department totals. Summary GWA values are supplied mock figures, not a production calculation.", false, 9)

  pages.forEach((page, index) => {
    commands = page
    text("Fictional sample records | SAAIS frontend preview", margin, height - 28, 8)
    text(`Page ${index + 1} of ${pages.length}`, width - 100, height - 28, 8)
  })

  const objects = ["", "<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"]
  const kids: string[] = []
  for (const page of pages) {
    const pageId = objects.length, streamId = pageId + 1, stream = `${page.join("\n")}\n`
    kids.push(`${pageId} 0 R`)
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`
  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  for (let index = 1; index < objects.length; index++) {
    offsets.push(pdf.length)
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}

export function reportPdfFilename(report: DepartmentReport): string {
  return `SAAIS-department-report-${report.termId}-${report.programKey}.pdf`
}

export function downloadReportPdf(report: DepartmentReport): void {
  const bytes = createReportPdf(report)
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }))
  const link = document.createElement("a")
  link.href = url
  link.download = reportPdfFilename(report)
  document.body.append(link)
  link.click()
  link.remove()
  // Allow the browser to start reading the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
