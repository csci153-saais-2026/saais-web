import type { ApiSchema } from '@/lib/api'

export const dashboardPdfFilename = 'SAAIS-adviser-dashboard.pdf'

/** Create a report from the same scoped data currently displayed on the dashboard. */
export async function createDashboardPdf(report: ApiSchema<'AdviserDashboardReport'>, termLabel: string, deficiencyCount?: number, adviserName?: string, department?: ApiSchema<'Department'>) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const green = '#29450e'
  const cream = '#f8f6ed'
  const clean = (value: string) => value.replace(/[–—]/g, '-').replace(/·/g, '|')
  const text = (value: string, x: number, y: number, options?: Parameters<typeof pdf.text>[3]) => pdf.text(clean(value), x, y, options)
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 14
  let y = 14

  const topStripe = () => { pdf.setFillColor(green); pdf.rect(0, 0, pageWidth, 2, 'F') }
  topStripe()
  // These are the same public institutional assets used by the application.
  const logos = await Promise.all(['bagong-pilipinas.png', 'vsu-wordmark.png'].map(async name => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${name}`)
      if (!response.ok) return null
      return new Uint8Array(await response.arrayBuffer())
    } catch { return null }
  }))
  if (logos[0]) pdf.addImage(logos[0], 'PNG', margin, 10, 25, 24)
  if (logos[1]) pdf.addImage(logos[1], 'PNG', margin + 29, 10, 68, 24)
  pdf.setDrawColor(green); pdf.line(115, 10, 115, 34)
  pdf.setTextColor(green); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
  text(department?.letterhead_prefix ?? 'Department', 120, 17)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
  const departmentLines = pdf.splitTextToSize(department?.letterhead_name ?? department?.name ?? 'Department unavailable', pageWidth - 135) as string[]
  pdf.text(departmentLines, 120, 25)
  pdf.setTextColor('#111111'); pdf.setFontSize(12)
  text('DASHBOARD', pageWidth / 2, 44, { align: 'center' })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
  text('Adviser dashboard | Your advisees at a glance.', pageWidth / 2, 50, { align: 'center' })
  pdf.setFillColor('#eef2eb'); pdf.rect(margin, 53, pageWidth - margin * 2, 9, 'F')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
  text(`STUDENTS: ${report.total_advisees} (Assigned to you) | MEAN GWA: ${report.mean_gwa?.toFixed(2) ?? 'Not available'} | WITH DEFICIENCIES: ${deficiencyCount ?? report.advisees_with_deficiencies?.length ?? 'Not available'}`, margin + 3, 59)
  y = 70

  const heading = (title: string) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); text(title, margin, y); y += 5 }
  const table = (headers: string[], rows: string[][], columns: number[]) => {
    const header = () => {
      pdf.setFillColor(green); pdf.rect(margin, y, pageWidth - margin * 2, 9, 'F')
      pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8)
      headers.forEach((value, index) => text(value, columns[index], y + 6))
      pdf.setTextColor('#111111'); y += 9
    }
    header()
    rows.forEach((row, index) => {
      if (y > pageHeight - 20) { pdf.addPage(); topStripe(); y = 12; header() }
      if (index % 2 === 1) { pdf.setFillColor(cream); pdf.rect(margin, y, pageWidth - margin * 2, 9, 'F') }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
      row.forEach((value, column) => text(value, columns[column], y + 6))
      y += 9
    })
    y += 9
  }
  heading(`Final grade distribution - ${termLabel}`)
  const distribution = report.grade_distribution
  const statuses = distribution ? distribution.inc_count + distribution.dr_count + distribution.na_count : 0
  const total = distribution ? distribution.total_graded + statuses : 0
  const share = (count: number) => total ? `${(count / total * 100).toFixed(1).replace(/\.0$/, '')}%` : '0%'
  table(['Grade range', 'Share of final grades'], distribution ? [...distribution.buckets.map(bucket => [bucket.label, `${bucket.percentage}%`]), ['INC / DR / NA', share(statuses)]] : [['Not available', '-']], [17, 120])
  if (y > pageHeight - 40) { pdf.addPage(); topStripe(); y = 15 }
  heading('GWA by batch and curriculum version')
  table(['BATCH', 'CURRICULUM', 'STUDENTS', 'MEAN GWA'], report.batch_curriculum_gwa?.length ? report.batch_curriculum_gwa.map(row => [String(row.entry_year), `${row.program_code} ${row.curriculum_label}`, String(row.student_count), row.mean_gwa?.toFixed(2) ?? 'Not available']) : [['Not available', '-', '-', '-']], [17, 78, 165, 225])

  pdf.addPage(); topStripe(); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
  text('Dashboard (continued)', margin, 16)
  pdf.setDrawColor('#888888'); pdf.line(40, 43, 125, 43); pdf.line(172, 43, 257, 43)
  pdf.setFont('helvetica', 'bold')
  if (adviserName) text(adviserName, 82.5, 49, { align: 'center' })
  if (department?.department_head_name) text(department.department_head_name, 214.5, 49, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  text('Prepared by: Academic Adviser', 82.5, 55, { align: 'center' })
  text('Noted by: Department Head', 214.5, 55, { align: 'center' })
  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor('#666666')
    text(`Report data as of ${new Date(report.computed_at).toLocaleString()} | Generated ${new Date().toLocaleDateString()} through SAAIS`, margin, pageHeight - 7)
    text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, { align: 'right' })
  }
  return pdf.output('blob')
}
