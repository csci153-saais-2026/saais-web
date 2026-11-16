import { useState } from "react"
import { Link, useParams } from "react-router"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import {
  RecordTabs,
  StudentRecordHeader,
} from "@/components/features/student-record-header"
import { Button } from "@/components/ui/button"
import { DeanReadOnlyNotice } from "@/routes/dean/components/DeanReadOnlyNotice"
import { getDeanStudentDetail } from "@/routes/dean/data/faculty-students"

const DEAN_RECORD_TABS = [
  { value: "checklist", label: "Checklist" },
  { value: "grades", label: "Grades" },
  { value: "audit", label: "Audit log" },
]

export default function DeanStudentDetailPage() {
  const { studentNumber = "" } = useParams()
  const [activeTab, setActiveTab] = useState("checklist")
  const student = getDeanStudentDetail(decodeURIComponent(studentNumber))

  if (!student) {
    return (
      <Panel
        title="Student record not found"
        description={`No student matching "${studentNumber}" was found in the faculty directory.`}
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/dean/students">Back to Students</Link>
        </Button>
      </Panel>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/dean/students">Back to Students</Link>
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {student.department} · {student.curriculum} · Adviser: {student.adviser}
        </span>
      </div>

      <DeanReadOnlyNotice />

      <StudentRecordHeader
        name={student.name}
        initials={student.initials}
        studentNumber={student.studentNumber}
        program={student.program}
        yearLabel={student.yearLabel}
        email={student.email}
        standing={student.standing}
      />

      <RecordTabs
        tabs={DEAN_RECORD_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
      />

      {activeTab === "checklist" && (
        <Panel title="Degree checklist" description="Read-only curriculum progress.">
          <p className="text-sm text-muted-foreground">Checklist loading…</p>
        </Panel>
      )}

      {activeTab === "grades" && (
        <Panel title="Grade history" description="Read-only term grades.">
          <p className="text-sm text-muted-foreground">Grades loading…</p>
        </Panel>
      )}

      {activeTab === "audit" && (
        <Panel title="Record audit trail" description="View and grade change history for this student.">
          <p className="text-sm text-muted-foreground">Audit log loading…</p>
        </Panel>
      )}

      <SampleFooter>Fictional sample records · Reference date: 28 October 2026</SampleFooter>
    </div>
  )
}
