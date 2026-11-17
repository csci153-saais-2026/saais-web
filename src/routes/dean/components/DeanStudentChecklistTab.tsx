import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChecklistTermGroup, type ChecklistRow } from "@/components/features/checklist-term-group"
import { DegreeProgress } from "@/components/features/degree-progress"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Status } from "@/components/ui/status-badge"
import type { ApiSchema } from "@/lib/api"
import { getDeanStudentChecklist } from "@/routes/dean/api/dean.api"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import type { DeanStudentSummary } from "@/routes/dean/types"

const STATUS_MAP: Record<ApiSchema<"ChecklistSlotResult">["status"], Status> = {
  not_taken: "not-taken",
  currently_enrolled: "enrolled",
  passed: "passed",
  failed: "failed",
  inc: "inc",
  dr: "dr",
  na: "na",
}

function buildChecklistTerms(data: {
  results: ApiSchema<"ChecklistSlotResult">[]
  slots: ApiSchema<"CurriculumTermCourse">[]
  terms: ApiSchema<"CurriculumTerm">[]
  courses: ApiSchema<"Course">[]
}) {
  const groups = new Map<string, ChecklistRow[]>()

  for (const result of data.results) {
    const slot = data.slots.find((item) => item.id === result.curriculum_term_course_id)
    const term = data.terms.find((item) => item.id === slot?.curriculum_term_id)
    const course = data.courses.find((item) => item.id === slot?.course_id)
    const title = term
      ? `Year ${term.year_level} · Semester ${term.term_sequence}`
      : "Other requirements"
    const attempts = result.attempts?.length ?? 0

    const row: ChecklistRow = {
      code: course?.code ?? slot?.slot_label ?? "Requirement",
      title: course?.title ?? "Elective requirement",
      status: STATUS_MAP[result.status],
      unitsRequired: result.required_units,
      unitsEarned: result.earned_units,
      source:
        result.satisfaction_source ??
        (attempts > 0 ? "Direct attempt" : "Not yet satisfied"),
      attempts,
    }

    groups.set(title, [...(groups.get(title) ?? []), row])
  }

  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([title, rows]) => ({ title, rows }))
}

export function DeanStudentChecklistTab({ student }: { student: DeanStudentSummary }) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null)

  const checklistQuery = useQuery({
    queryKey: ["dean", "student-checklist", student.studentId],
    queryFn: () => getDeanStudentChecklist(student.studentId),
  })

  if (!checklistQuery.data) {
    return (
      <DeanQueryState
        isLoading={checklistQuery.isLoading}
        isError={checklistQuery.isError}
        label="student checklist"
        onRetry={() => void checklistQuery.refetch()}
      />
    )
  }

  const terms = buildChecklistTerms(checklistQuery.data)
  const selectedCourse = selectedCourseCode
    ? checklistQuery.data.courses.find((c) => c.code === selectedCourseCode) ?? null
    : null

  return (
    <div className="space-y-6">
      <DegreeProgress
        program={student.program}
        curriculum={student.curriculum}
        earned={student.unitsEarned}
        required={student.unitsRequired}
      >
        Cumulative GWA: <strong className="font-mono text-primary">{student.gwa}</strong> ·
        Read-only Dean inspection
      </DegreeProgress>

      {terms.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No checklist is available for this curriculum.
        </p>
      ) : (
        <div className="space-y-4">
          {terms.map((term) => (
            <ChecklistTermGroup
              key={term.title}
              title={term.title}
              passedUnits={term.rows.reduce((sum, r) => sum + r.unitsEarned, 0)}
              totalUnits={term.rows.reduce((sum, r) => sum + r.unitsRequired, 0)}
              rows={term.rows}
              onCourseInfo={setSelectedCourseCode}
            />
          ))}
        </div>
      )}

      <Dialog
        open={selectedCourseCode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCourseCode(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCourse
                ? `${selectedCourse.code} · ${selectedCourse.title}`
                : selectedCourseCode}
            </DialogTitle>
            <DialogDescription>
              {selectedCourse
                ? `${selectedCourse.units} units · Category: ${selectedCourse.category}`
                : "Course catalog metadata"}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {selectedCourse
              ? selectedCourse.is_active
                ? "Active catalog course in this student's curriculum."
                : "Archived catalog course."
              : "No additional catalog metadata is recorded for this requirement."}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedCourseCode(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
