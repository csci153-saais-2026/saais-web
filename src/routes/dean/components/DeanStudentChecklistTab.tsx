import { useState } from "react"
import { ChecklistTermGroup } from "@/components/features/checklist-term-group"
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
import { DEAN_COURSE_CATALOG } from "@/routes/dean/data/faculty-students"
import type { DeanStudentDetail } from "@/routes/dean/types"

export function DeanStudentChecklistTab({ student }: { student: DeanStudentDetail }) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null)
  const courseInfo = selectedCourseCode ? DEAN_COURSE_CATALOG[selectedCourseCode] : null

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

      <div className="space-y-4">
        {student.checklistTerms.map((term) => (
          <ChecklistTermGroup
            key={term.id}
            title={term.title}
            description={term.description}
            passedUnits={term.passedUnits}
            totalUnits={term.totalUnits}
            semesterGwa={term.semesterGwa}
            rows={term.rows}
            onCourseInfo={setSelectedCourseCode}
          />
        ))}
      </div>

      <Dialog
        open={selectedCourseCode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCourseCode(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {courseInfo ? `${courseInfo.code} · ${courseInfo.title}` : selectedCourseCode}
            </DialogTitle>
            <DialogDescription>
              {courseInfo
                ? `${courseInfo.units} units · Prerequisites: ${courseInfo.prerequisites}`
                : "Course catalog metadata"}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {courseInfo
              ? courseInfo.description
              : "No additional catalog description is recorded for this course."}
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
