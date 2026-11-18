import { useState } from "react"
import { CohortStudentsDialog } from "@/routes/dean/reports/CohortStudentsDialog"
import { DeanPdfViewerDialog } from "@/routes/dean/reports/DeanPdfViewerDialog"
import { FacultyBatchGwaTable } from "@/routes/dean/reports/FacultyBatchGwaTable"
import { FacultyReportHeader } from "@/routes/dean/reports/FacultyReportHeader"
import { FacultyReportStatsAndDistribution } from "@/routes/dean/reports/FacultyReportStatsAndDistribution"
import { useDeanReports } from "@/routes/dean/reports/use-dean-reports"
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState"
import { DeanStudentRecordDialog } from "@/routes/dean/students/DeanStudentRecordDialog"
import { toDeanStudentSummary } from "@/routes/dean/students/to-dean-student-summary"
import type {
  BatchCurriculumRow,
  DeanStudentSummary,
  DepartmentFilter,
  FacultyDepartmentReport,
} from "@/routes/dean/types"

export default function DeanReportsPage() {
  const [department, setDepartment] = useState<DepartmentFilter>("All departments")
  const [selectedBatch, setSelectedBatch] = useState<BatchCurriculumRow | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<DeanStudentSummary | null>(null)
  const [pdfPreviewReport, setPdfPreviewReport] = useState<FacultyDepartmentReport | null>(null)

  const {
    report,
    rosterItems,
    facultyName,
    departmentOptions,
    isLoading,
    isError,
    isFacultyUnavailable,
    refetch,
    recordView,
  } = useDeanReports(department)

  const handleOpenPdfPreview = () => {
    if (!report) return
    setPdfPreviewReport(report)
  }

  const handleSelectBatch = (row: BatchCurriculumRow) => {
    setSelectedBatch(row)
    recordView(
      "report_viewed",
      `Report drill-down: batch ${row.batch} (${row.students} students)`,
    )
  }

  const cohortStudents =
    report && selectedBatch
      ? report.cohortSamples[`${selectedBatch.batch}::${selectedBatch.curriculum}`] ?? []
      : []

  return (
    <div className="space-y-6">
      <FacultyReportHeader
        facultyName={facultyName}
        department={department}
        departments={departmentOptions}
        onDepartmentChange={setDepartment}
        onExportPdf={handleOpenPdfPreview}
        disabled={!report}
      />

      {!report ? (
        <DeanQueryState
          isLoading={isLoading}
          isError={isError}
          isEmpty={isFacultyUnavailable}
          label="faculty reports"
          emptyTitle="Faculty unavailable"
          emptyMessage="Faculty information is unavailable for this account."
          onRetry={refetch}
        />
      ) : (
        <>
          <FacultyReportStatsAndDistribution report={report} />

          <FacultyBatchGwaTable
            rows={report.batchRows}
            onSelectBatch={handleSelectBatch}
          />
        </>
      )}

      <CohortStudentsDialog
        batch={selectedBatch}
        students={cohortStudents}
        open={selectedBatch !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBatch(null)
        }}
        onOpenStudent={(studentId) => {
          const matched = rosterItems.find(
            (item) => item.student_id === studentId,
          )
          setSelectedBatch(null)
          if (matched) {
            setSelectedStudent(toDeanStudentSummary(matched))
          }
        }}
      />

      <DeanStudentRecordDialog
        key={selectedStudent?.studentId ?? "closed"}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />

      <DeanPdfViewerDialog
        report={pdfPreviewReport}
        facultyName={facultyName}
        onClose={() => setPdfPreviewReport(null)}
        onDownloaded={(downloadedReport) =>
          recordView(
            "pdf_exported",
            `Exported faculty report (${downloadedReport.department}) as PDF`,
          )
        }
      />
    </div>
  )
}
