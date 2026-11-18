import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  RecordTabs,
  StudentRecordHeader,
} from "@/components/features/student-record-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { postDeanAuditViewEvent } from "@/routes/dean/api/dean.api"
import { DeanStudentAuditTab } from "@/routes/dean/components/DeanStudentAuditTab"
import { DeanStudentChecklistTab } from "@/routes/dean/components/DeanStudentChecklistTab"
import { DeanStudentGradesTab } from "@/routes/dean/components/DeanStudentGradesTab"
import type { DeanStudentSummary } from "@/routes/dean/types"

const DEAN_RECORD_TABS = [
  { value: "checklist", label: "Checklist" },
  { value: "grades", label: "Grades" },
  { value: "audit", label: "Audit log" },
]

export function DeanStudentRecordDialog({
  student,
  onClose,
}: {
  student: DeanStudentSummary | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("checklist")

  useEffect(() => {
    if (!student) return
    void postDeanAuditViewEvent({
      event_type: "student_record_viewed",
      student_id: student.studentId,
      details: `Viewed student academic record (${student.studentNumber})`,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: ["dean", "audit-log"] }))
      .catch(() => undefined)
  }, [student, queryClient])

  return (
    <Dialog open={student !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex h-[min(85dvh,760px)] w-[calc(100%-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {student ? `${student.name} · Academic record` : "Student record"}
          </DialogTitle>
          <DialogDescription>
            {student
              ? `${student.studentNumber} · ${student.program} · ${student.yearLabel}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
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

            {activeTab === "checklist" && <DeanStudentChecklistTab student={student} />}
            {activeTab === "grades" && <DeanStudentGradesTab student={student} />}
            {activeTab === "audit" && <DeanStudentAuditTab student={student} />}
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
