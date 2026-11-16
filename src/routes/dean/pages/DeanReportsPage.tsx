import { useState } from "react"
import { SampleFooter } from "@/components/features/sample-footer"
import { FacultyBatchGwaTable } from "@/routes/dean/components/FacultyBatchGwaTable"
import { FacultyReportHeader } from "@/routes/dean/components/FacultyReportHeader"
import { FacultyReportStatsAndDistribution } from "@/routes/dean/components/FacultyReportStatsAndDistribution"
import { FACULTY_REPORTS } from "@/routes/dean/data/faculty-reports"
import type { BatchCurriculumRow, DepartmentFilter } from "@/routes/dean/types"
import { downloadFacultyReportPdf } from "@/routes/dean/utils/faculty-report-pdf"

export default function DeanReportsPage() {
  const [department, setDepartment] = useState<DepartmentFilter>("All departments")
  const [selectedBatch, setSelectedBatch] = useState<BatchCurriculumRow | null>(null)
  const report = FACULTY_REPORTS[department]

  const handleExportPdf = () => {
    downloadFacultyReportPdf(report)
  }

  const handleSelectBatch = (row: BatchCurriculumRow) => {
    setSelectedBatch(row)
  }

  return (
    <div className="space-y-6">
      <FacultyReportHeader
        department={department}
        onDepartmentChange={setDepartment}
        onExportPdf={handleExportPdf}
      />

      <FacultyReportStatsAndDistribution report={report} />

      <FacultyBatchGwaTable
        rows={report.batchRows}
        onSelectBatch={handleSelectBatch}
      />

      {selectedBatch && (
        <p className="sr-only" aria-live="polite">
          Selected batch {selectedBatch.batch}
        </p>
      )}

      <SampleFooter>Fictional sample records · Reference date: 28 October 2026</SampleFooter>
    </div>
  )
}
