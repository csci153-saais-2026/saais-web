import { useState } from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReassignAdviserDialog } from "./ReassignAdviserDialog"
import { StudentDirectoryFilters } from "./shared/StudentDirectoryFilters"
import { assignmentDateLabel, type ReassignmentInput } from "./assignment-model"
import { todayInManila, useDepartmentHeadPreview } from "./shared/preview-state"
import { SAMPLE_STUDENTS, type DirectoryStudent } from "./shared/students-data"

type Filters = { search: string; curriculum: string; adviser: string }

function matches(student: DirectoryStudent, filters: Filters) {
  const query = filters.search.trim().toLowerCase()
  return (student.name.toLowerCase().includes(query) || student.studentNumber.toLowerCase().includes(query))
    && (filters.curriculum === "all" || student.curriculum === filters.curriculum)
    && (filters.adviser === "all" || student.adviser === filters.adviser)
}

export default function AdviserAssignmentsPage() {
  const { students, reassignStudents, notify } = useDepartmentHeadPreview()
  const [filters, setFilters] = useState<Filters>({ search: "", curriculum: "all", adviser: "all" })
  const [selected, setSelected] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const visible = students.filter((student) => matches(student, filters))
  const visibleIds = new Set(visible.map((student) => student.id))
  const selectedVisible = selected.filter((id) => visibleIds.has(id))
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length
  const partiallySelected = selectedVisible.length > 0 && !allSelected
  // Keep the sample adviser roster available even after their last student is reassigned.
  const advisers = [...new Set([...SAMPLE_STUDENTS, ...students].map((student) => student.adviser))].sort()

  function changeFilters(next: Filters) {
    setFilters(next)
    // Match the mockup: filtering removes selections that are no longer visible.
    const stillVisible = new Set(students.filter((student) => matches(student, next)).map((student) => student.id))
    setSelected((current) => current.filter((id) => stillVisible.has(id)))
  }

  function toggleStudent(id: string, checked: boolean) {
    setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id))
  }

  function openReassignment() {
    if (selectedVisible.length === 0) {
      notify("Select at least one student to reassign.")
      return
    }
    setDialogOpen(true)
  }

  function apply(input: ReassignmentInput) {
    const changed = students.filter((student) => input.studentIds.includes(student.id) && student.adviser !== input.adviser).length
    reassignStudents(input)
    setSelected([])
    notify(`${input.effectiveDate > todayInManila() ? "Scheduled reassignment for" : "Reassigned"} ${changed} sample student${changed === 1 ? "" : "s"}.`)
  }

  return (
    <>
      <PageHeading title="Adviser assignments" subtitle="Keep every student connected to an adviser in your department." />
      <Panel title="Student–adviser assignments" description="Reassignments retain the previous adviser and effective date." flush>
        <StudentDirectoryFilters students={students} {...filters}
          onSearchChange={(search) => changeFilters({ ...filters, search })}
          onCurriculumChange={(curriculum) => changeFilters({ ...filters, curriculum })}
          onAdviserChange={(adviser) => changeFilters({ ...filters, adviser })}
          onReset={() => changeFilters({ search: "", curriculum: "all", adviser: "all" })} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-start gap-3">
            <Checkbox id="assignments-select-all" aria-label="Select all visible students" disabled={visible.length === 0}
              checked={partiallySelected ? "indeterminate" : allSelected}
              onCheckedChange={(checked) => setSelected(checked === true ? visible.map((student) => student.id) : [])}
              className="mt-1 data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:before:absolute data-[state=indeterminate]:before:h-px data-[state=indeterminate]:before:w-2 data-[state=indeterminate]:before:bg-primary-foreground data-[state=indeterminate]:[&_svg]:hidden" />
            <div>
              <label htmlFor="assignments-select-all" className="text-sm font-semibold">Select all visible students</label>
              <p aria-live="polite" className="text-sm">{selectedVisible.length} student{selectedVisible.length === 1 ? "" : "s"} selected</p>
              <p className="mt-1 text-xs text-muted-foreground">Select all applies to the filtered list. Hidden students are deselected.</p>
            </div>
          </div>
          <Button type="button" onClick={openReassignment}>Reassign selected</Button>
        </div>
        <Table responsive aria-label="Student adviser assignments">
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="w-12"><span className="sr-only">Select</span></TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Current adviser</TableHead>
              <TableHead>Since</TableHead>
              <TableHead>Previous adviser</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((student) => (
              <TableRow key={student.id} data-state={selected.includes(student.id) ? "selected" : undefined}>
                <TableCell label="Select">
                  <Checkbox aria-label={`Select ${student.name}`} checked={selected.includes(student.id)}
                    onCheckedChange={(checked) => toggleStudent(student.id, checked === true)} />
                </TableCell>
                <TableCell label="Student" className="whitespace-normal">
                  <div className="min-w-0">
                    <span className="block font-semibold">{student.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{student.studentNumber}</span>
                    <Badge variant="secondary" className="mt-1 rounded-sm">{student.curriculum}</Badge>
                  </div>
                </TableCell>
                <TableCell label="Current adviser" className="whitespace-normal">
                  <div className="min-w-0">
                    <span>{student.adviser}</span>
                    {student.scheduledAssignment && (
                      <p className="mt-1 max-w-64 text-xs text-muted-foreground">
                        Scheduled: {student.scheduledAssignment.adviser} from {assignmentDateLabel(student.scheduledAssignment.effectiveDate)}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell label="Since">{assignmentDateLabel(student.adviserSince)}</TableCell>
                <TableCell label="Previous adviser" className="whitespace-normal"><span className="min-w-0">{student.previousAdviser || "—"}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {visible.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No students match these filters.</p>}
        <p role="status" className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          Showing {visible.length} of {students.length} sample assignments
        </p>
      </Panel>
      {dialogOpen && <ReassignAdviserDialog studentIds={selectedVisible} advisers={advisers} open={dialogOpen}
        onOpenChange={setDialogOpen} onConfirm={apply} />}
      <SampleFooter>Fictional records. Changes stay in this preview and do not update university records.</SampleFooter>
    </>
  )
}
