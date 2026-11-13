import { useState } from "react"
import { ChecklistTermGroup } from "@/components/features/checklist-term-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CHECKLIST_PREVIEWS } from "./checklist-preview-data"
import type { DirectoryStudent } from "../shared/students-data"

export function StudentChecklistPreviewDialog({ student, onClose }: { student: DirectoryStudent; onClose: () => void }) {
  const [courseCode, setCourseCode] = useState("")
  const terms = CHECKLIST_PREVIEWS[student.curriculum] ?? []
  const course = terms.flatMap((term) => term.rows).find((row) => row.code === courseCode)
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{student.name} · Checklist</DialogTitle>
          <DialogDescription>{student.studentNumber} · {student.curriculum} · {student.yearStanding}</DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-wrap items-center gap-2"><Badge variant="secondary" className="rounded-sm">Read-only preview</Badge><span className="text-xs text-muted-foreground">Illustrative checklist excerpt, not a complete academic record.</span></div>
        <div className="min-w-0 [&_[data-slot=collapsible-trigger]]:flex-wrap [&_[data-slot=collapsible-trigger]>span:first-child]:basis-full sm:[&_[data-slot=collapsible-trigger]]:flex-nowrap sm:[&_[data-slot=collapsible-trigger]>span:first-child]:basis-auto">
        {terms.map((term) => <ChecklistTermGroup key={term.title} title={term.title} rows={term.rows}
          passedUnits={term.rows.reduce((total, row) => total + row.unitsEarned, 0)}
          totalUnits={term.rows.reduce((total, row) => total + row.unitsRequired, 0)}
          semesterGwa={term.semesterGwa} onCourseInfo={setCourseCode} />)}
        </div>
        <p className="text-xs text-muted-foreground sm:hidden">Swipe across the course table to see all columns.</p>
        {terms.length === 0 && <p>No sample checklist is available for this curriculum.</p>}
        {course && <Alert><AlertDescription>{course.code} · {course.title}. This sample requirement carries {course.unitsRequired} units.</AlertDescription></Alert>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close preview</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
