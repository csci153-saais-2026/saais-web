import { useState } from "react"
import { GradeDistribution } from "@/components/features/grade-distribution"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import { StatGrid } from "@/components/features/stat-tile"
import { DownloadIcon } from "@/components/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReportCohortDialog } from "./ReportCohortDialog"
import { ReportFilters } from "./ReportFilters"
import { getDepartmentReport, REPORT_TERMS, type CohortSummary, type ProgramKey } from "./reports-data"
import { downloadReportPdf } from "./report-pdf"

export default function DepartmentReportsPage() {
  const [term, setTerm] = useState(REPORT_TERMS[0].value)
  const [program, setProgram] = useState<ProgramKey>("all")
  const [cohort, setCohort] = useState<CohortSummary | null>(null)
  const [exportError, setExportError] = useState("")
  const report = getDepartmentReport(term, program)

  function exportPdf() {
    if (!report) return
    setExportError("")
    try { downloadReportPdf(report) } catch {
      setExportError("The PDF could not be created. Please try exporting the report again.")
    }
  }

  return (
    <>
      <PageHeading title="Department reports" subtitle="A semester snapshot of student progress across your department."
        actions={<Button type="button" variant="outline" disabled={!report} onClick={exportPdf}><DownloadIcon />Export PDF</Button>} />
      <ReportFilters term={term} program={program}
        onTermChange={(value) => { setTerm(value); setCohort(null); setExportError("") }}
        onProgramChange={(value) => { setProgram(value); setCohort(null); setExportError("") }} />
      {exportError && <Alert variant="destructive" className="mb-5"><AlertTitle>Export unsuccessful</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
      {!report ? (
        <Panel title="No sample report available">
          <p className="text-muted-foreground">There are no sample records for this academic term and degree program.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => { setTerm(REPORT_TERMS[0].value); setProgram("all") }}>Show latest sample report</Button>
        </Panel>
      ) : (
        <div aria-label="Selected department report">
          <p className="sr-only" role="status">Showing {report.termLabel}, {report.programLabel}.</p>
          <StatGrid className="lg:grid-cols-3" items={[
            { label: "Currently enrolled", value: report.enrolled.toLocaleString("en-US"), note: report.enrolmentNote },
            { label: "Mean GWA", value: report.meanGwa, note: "Supplied sample academic summary" },
            { label: "Students with deficiencies", value: report.deficiencies, note: `${(report.deficiencies / report.enrolled * 100).toFixed(1)}% of enrolled students` },
          ]} />
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel title="Final grade distribution" description={report.termLabel}>
              <GradeDistribution bands={report.distribution} />
              <p className="mt-5 text-xs text-muted-foreground">{report.gradeRecords.toLocaleString("en-US")} course grade records · Percentages sum to 100%.<br />INC, DR and NA are excluded from this sample mean GWA.</p>
            </Panel>
            <Panel title="Department curriculum summary" description={report.programLabel}>
              <ul className="divide-y divide-border">
                {report.curricula.map((curriculum) => (
                  <li key={curriculum.name} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2"><strong>{curriculum.name}</strong><Badge variant="secondary" className="rounded-sm">{curriculum.status}</Badge></div>
                    <p className="mt-1 text-sm text-muted-foreground">{curriculum.students.toLocaleString("en-US")} students</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
          <Panel title="GWA by batch and curriculum" description="Illustrative cohorts for the selected report; not the complete department population." flush>
            <Table responsive aria-label="GWA by batch and curriculum">
              <TableHeader className="bg-secondary"><TableRow><TableHead>Entry year</TableHead><TableHead>Study range</TableHead><TableHead>Curriculum</TableHead><TableHead className="text-right">Students</TableHead><TableHead className="text-right">Mean GWA</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{report.cohorts.map((row) => (
                <TableRow key={row.id}>
                  <TableCell label="Entry year" className="font-mono">{row.entryYear}</TableCell>
                  <TableCell label="Study range">{row.entryYear}–{row.entryYear + 4}</TableCell>
                  <TableCell label="Curriculum">{row.curriculum}</TableCell>
                  <TableCell label="Students" className="text-right font-mono">{row.students}</TableCell>
                  <TableCell label="Mean GWA" className="text-right font-mono">{row.meanGwa}</TableCell>
                  <TableCell label="Actions"><Button type="button" variant="link" size="sm" aria-label={`View students for ${row.curriculum} batch ${row.entryYear}`} onClick={() => setCohort(row)}>View students →</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">{report.cohorts.length} sample cohorts · {report.programLabel}</p>
          </Panel>
        </div>
      )}
      <ReportCohortDialog cohort={cohort} onClose={() => setCohort(null)} />
      <SampleFooter>Fictional report figures · Academic snapshot: 15 August 2025.</SampleFooter>
    </>
  )
}
