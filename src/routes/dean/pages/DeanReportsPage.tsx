import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getDeanAttemptResults,
  getDeanFaculties,
  getDeanStudents,
  getFacultyDepartments,
  getFacultyReport,
  postDeanAuditViewEvent,
} from "@/routes/dean/api/dean.api"
import { CohortStudentsDialog } from "@/routes/dean/components/CohortStudentsDialog"
import { DeanPdfViewerDialog } from "@/routes/dean/components/DeanPdfViewerDialog"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import { DeanStudentRecordDialog } from "@/routes/dean/components/DeanStudentRecordDialog"
import { FacultyBatchGwaTable } from "@/routes/dean/components/FacultyBatchGwaTable"
import { FacultyReportHeader } from "@/routes/dean/components/FacultyReportHeader"
import { FacultyReportStatsAndDistribution } from "@/routes/dean/components/FacultyReportStatsAndDistribution"
import type {
  BatchCurriculumRow,
  DeanStudentSummary,
  DepartmentFilter,
  FacultyDepartmentReport,
} from "@/routes/dean/types"
import { buildFacultyDepartmentReport } from "@/routes/dean/utils/build-faculty-report"
import { toDeanStudentSummary } from "@/routes/dean/utils/to-dean-student-summary"

export default function DeanReportsPage() {
  const queryClient = useQueryClient()
  const [department, setDepartment] = useState<DepartmentFilter>("All departments")
  const [selectedBatch, setSelectedBatch] = useState<BatchCurriculumRow | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<DeanStudentSummary | null>(null)
  const [pdfPreviewReport, setPdfPreviewReport] = useState<FacultyDepartmentReport | null>(null)

  const reportsQuery = useQuery({
    queryKey: ["dean", "faculty-report"],
    queryFn: async () => {
      const [facultyReport, faculties, departments, roster, attemptResults] = await Promise.all([
        getFacultyReport(),
        getDeanFaculties(),
        getFacultyDepartments(),
        getDeanStudents(),
        getDeanAttemptResults(),
      ])
      return { facultyReport, faculties, departments, roster, attemptResults }
    },
  })

  const facultyName = useMemo(() => {
    const id = reportsQuery.data?.facultyReport.faculty_id
    return (
      reportsQuery.data?.faculties.find((f) => f.id === id)?.name ??
      "Faculty of Computing"
    )
  }, [reportsQuery.data])

  const departmentOptions = useMemo(() => {
    const depts = reportsQuery.data?.departments ?? []
    const facultyId = reportsQuery.data?.facultyReport.faculty_id
    const scoped = facultyId ? depts.filter((d) => d.faculty_id === facultyId) : depts
    return ["All departments", ...scoped.map((d) => d.code || d.name)]
  }, [reportsQuery.data])

  const report = useMemo(() => {
    if (!reportsQuery.data) return null
    return buildFacultyDepartmentReport({
      selectedDepartment: department,
      facultyReport: reportsQuery.data.facultyReport,
      departments: reportsQuery.data.departments,
      rosterItems: reportsQuery.data.roster.items,
      attemptResults: reportsQuery.data.attemptResults,
    })
  }, [reportsQuery.data, department])

  const recordView = (
    eventType: "report_viewed" | "pdf_exported",
    details: string,
  ) => {
    void postDeanAuditViewEvent({
      event_type: eventType,
      report_type: "faculty",
      details,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["dean", "audit-log"] }))
      .catch(() => undefined)
  }

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
          isLoading={reportsQuery.isLoading}
          isError={reportsQuery.isError}
          label="faculty reports"
          onRetry={() => void reportsQuery.refetch()}
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
          const matched = reportsQuery.data?.roster.items.find(
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
