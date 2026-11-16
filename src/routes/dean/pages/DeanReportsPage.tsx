import { useState } from "react"
import { SampleFooter } from "@/components/features/sample-footer"
import { FacultyReportHeader } from "@/routes/dean/components/FacultyReportHeader"
import { FACULTY_REPORTS } from "@/routes/dean/data/faculty-reports"
import type { DepartmentFilter } from "@/routes/dean/types"
import { downloadFacultyReportPdf } from "@/routes/dean/utils/faculty-report-pdf"

export default function DeanReportsPage() {
  const [department, setDepartment] = useState<DepartmentFilter>("All departments")
  const report = FACULTY_REPORTS[department]

  const handleExportPdf = () => {
    downloadFacultyReportPdf(report)
  }

  return (
    <div className="space-y-6">
      <FacultyReportHeader
        department={department}
        onDepartmentChange={setDepartment}
        onExportPdf={handleExportPdf}
      />

      <SampleFooter>Fictional sample records · Reference date: 28 October 2026</SampleFooter>
    </div>
  )
}
