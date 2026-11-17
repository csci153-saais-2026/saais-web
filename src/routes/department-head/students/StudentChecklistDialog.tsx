import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChecklistTermGroup, type ChecklistRow } from "@/components/features/checklist-term-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Status } from "@/components/ui/status-badge"
import type { ApiSchema } from "@/lib/api"
import { getChecklist } from "@/routes/adviser/advisees/checklist/record.api"
import { QueryMessage } from "../shared/dh-ui"
import type { DirectoryStudent } from "../shared/students-types"

const STATUS: Record<ApiSchema<"ChecklistSlotResult">["status"], Status> = {
  not_taken: "not-taken", currently_enrolled: "enrolled", passed: "passed", failed: "failed", inc: "inc", dr: "dr", na: "na",
}

type Checklist = Awaited<ReturnType<typeof getChecklist>>

function toTerms(data: Checklist) {
  const groups = new Map<string, ChecklistRow[]>()
  for (const result of data.results) {
    const slot = data.slots.find((item) => item.id === result.curriculum_term_course_id)
    const term = data.terms.find((item) => item.id === slot?.curriculum_term_id)
    const course = data.courses.find((item) => item.id === slot?.course_id)
    const title = term ? `Year ${term.year_level} · Semester ${term.term_sequence}` : "Other requirements"
    const attempts = result.attempts?.length ?? 0
    const row: ChecklistRow = {
      code: course?.code ?? slot?.slot_label ?? "Requirement",
      title: course?.title ?? "Elective requirement",
      status: STATUS[result.status],
      unitsRequired: result.required_units,
      unitsEarned: result.earned_units,
      source: result.satisfaction_source ?? (attempts ? "Direct attempt" : "Not yet satisfied"),
      attempts,
    }
    groups.set(title, [...(groups.get(title) ?? []), row])
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([title, rows]) => ({ title, rows }))
}

export function StudentChecklistDialog({ student, onClose }: { student: DirectoryStudent; onClose: () => void }) {
  const [courseCode, setCourseCode] = useState("")
  const checklist = useQuery({ queryKey: ["department-head", "checklist", student.id], queryFn: () => getChecklist(student.id) })
  const terms = checklist.data ? toTerms(checklist.data) : []
  const course = terms.flatMap((term) => term.rows).find((row) => row.code === courseCode)
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{student.name} · Checklist</DialogTitle>
          <DialogDescription>{student.studentNumber} · {student.curriculum} · {student.yearStanding}</DialogDescription>
        </DialogHeader>
        {!checklist.data ? <QueryMessage query={checklist} label="the checklist" /> : (
          <div className="min-w-0 [&_[data-slot=collapsible-trigger]]:flex-wrap [&_[data-slot=collapsible-trigger]>span:first-child]:basis-full sm:[&_[data-slot=collapsible-trigger]]:flex-nowrap sm:[&_[data-slot=collapsible-trigger]>span:first-child]:basis-auto">
            {terms.map((term) => <ChecklistTermGroup key={term.title} title={term.title} rows={term.rows}
              passedUnits={term.rows.reduce((total, row) => total + row.unitsEarned, 0)}
              totalUnits={term.rows.reduce((total, row) => total + row.unitsRequired, 0)}
              onCourseInfo={setCourseCode} />)}
            {terms.length === 0 && <p>No checklist is available for this curriculum.</p>}
          </div>
        )}
        {course && <Alert><AlertDescription>{course.code} · {course.title}. This requirement carries {course.unitsRequired} units.</AlertDescription></Alert>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
