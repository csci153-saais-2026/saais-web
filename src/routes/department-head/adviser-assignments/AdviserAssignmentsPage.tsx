import { useState } from "react"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { AlertIcon, SwapIcon } from "@/components/icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReassignAdviserDialog } from "./ReassignAdviserDialog"
import { StudentDirectoryFilters } from "../shared/StudentDirectoryFilters"
import { assignmentDateLabel, validateReassignment, type ReassignmentInput } from "./assignment-model"
import { useDepartmentAdvisers, useDirectoryStudents, useReassignStudents } from "../shared/dh-queries"
import { todayInManila } from "../shared/dh-utils"
import { QueryMessage } from "../shared/dh-ui"
import { useNotify } from "../shared/notify-context"
import type { DirectoryStudent } from "../shared/students-types"

const TH = "h-auto bg-secondary px-3.5 py-2.5 text-[11.5px] font-semibold tracking-[0.09em] text-muted-2 uppercase"
const TD = "px-3.5 py-[11px] text-[13.5px] leading-normal"

type Filters = { search: string; curriculum: string; adviser: string }

function matches(student: DirectoryStudent, filters: Filters) {
  const query = filters.search.trim().toLowerCase()
  return (student.name.toLowerCase().includes(query) || student.studentNumber.toLowerCase().includes(query))
    && (filters.curriculum === "all" || student.curriculum === filters.curriculum)
    && (filters.adviser === "all" || student.adviser === filters.adviser)
}

export default function AdviserAssignmentsPage() {
  const directory = useDirectoryStudents()
  const adviserQuery = useDepartmentAdvisers()
  const reassign = useReassignStudents()
  const notify = useNotify()
  const students = directory.data ?? []
  const [filters, setFilters] = useState<Filters>({ search: "", curriculum: "all", adviser: "all" })
  const [selected, setSelected] = useState<string[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const visible = students.filter((student) => matches(student, filters))
  const visibleIds = new Set(visible.map((student) => student.id))
  const selectedVisible = selected.filter((id) => visibleIds.has(id))
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length
  const partiallySelected = selectedVisible.length > 0 && !allSelected
  const advisers = adviserQuery.data ?? []

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

  async function apply(input: ReassignmentInput) {
    const adviser = advisers.find((candidate) => candidate.id === input.adviserId)
    const changed = validateReassignment(students, input, adviser?.name ?? "")
    await reassign.mutateAsync(input)
    setSelected([])
    notify(`${input.effectiveDate > todayInManila() ? "Scheduled reassignment for" : "Reassigned"} ${changed} student${changed === 1 ? "" : "s"}.`)
  }

  const heading = <PageHeading title="Adviser assignments" subtitle="Keep every student connected to an adviser in your department." />
  if (!directory.data) return <>{heading}<QueryMessage query={directory} label="adviser assignments" /></>

  return (
    <>
      {heading}
      <Alert variant="advisory">
        <AlertIcon />
        <AlertDescription>
          Reassignment takes effect on the selected date. The previous adviser and assignment history remain visible.
        </AlertDescription>
      </Alert>
      <Panel title="Student–adviser assignments" description="Select one or more students to reassign together." flush>
        <StudentDirectoryFilters students={students} {...filters}
          onSearchChange={(search) => changeFilters({ ...filters, search })}
          onCurriculumChange={(curriculum) => changeFilters({ ...filters, curriculum })}
          onAdviserChange={(adviser) => changeFilters({ ...filters, adviser })}
          onReset={() => changeFilters({ search: "", curriculum: "all", adviser: "all" })} />
        <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border px-5 py-4">
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {selectedVisible.length} student{selectedVisible.length === 1 ? "" : "s"} selected
          </span>
          <Button type="button" onClick={openReassignment}><SwapIcon aria-hidden="true" />Reassign selected</Button>
        </div>
        <Table responsive aria-label="Student adviser assignments">
          <TableHeader>
            <TableRow>
              <TableHead className={`${TH} w-20`}>
                <Checkbox aria-label="Select all visible students" disabled={visible.length === 0}
                  checked={partiallySelected ? "indeterminate" : allSelected}
                  onCheckedChange={(checked) => setSelected(checked === true ? visible.map((student) => student.id) : [])}
                  className="data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:before:absolute data-[state=indeterminate]:before:h-px data-[state=indeterminate]:before:w-2 data-[state=indeterminate]:before:bg-primary-foreground data-[state=indeterminate]:[&_svg]:hidden" />
              </TableHead>
              <TableHead className={TH}>Student</TableHead>
              <TableHead className={TH}>Current adviser</TableHead>
              <TableHead className={TH}>Since</TableHead>
              <TableHead className={TH}>Previous adviser</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((student) => (
              <TableRow key={student.id} className="border-line-soft hover:bg-line-soft" data-state={selected.includes(student.id) ? "selected" : undefined}>
                <TableCell label="Select" className={`${TD} w-20`}>
                  <Checkbox aria-label={`Select ${student.name}`} checked={selected.includes(student.id)}
                    onCheckedChange={(checked) => toggleStudent(student.id, checked === true)} />
                </TableCell>
                <TableCell label="Student" className={`${TD} whitespace-normal`}>
                  <div className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{student.name}</span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">{student.studentNumber}</span>
                    <Badge variant="secondary" className="mt-1 gap-1.5 rounded-sm"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{student.curriculum}</Badge>
                  </div>
                </TableCell>
                <TableCell label="Current adviser" className={`${TD} whitespace-normal`}>
                  <div className="min-w-0">
                    <span>{student.adviser}</span>
                    {student.scheduledAssignment && (
                      <p className="mt-1 max-w-64 text-xs text-muted-foreground">
                        Scheduled: {student.scheduledAssignment.adviser} from {assignmentDateLabel(student.scheduledAssignment.effectiveDate)}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell label="Since" className={TD}>{assignmentDateLabel(student.adviserSince)}</TableCell>
                <TableCell label="Previous adviser" className={`${TD} whitespace-normal`}><span className="min-w-0">{student.previousAdviser || "—"}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {visible.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No students match these filters.</p>}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <span role="status">Showing {visible.length} of {students.length} assignments</span>
          <span>DCST department scope</span>
        </div>
      </Panel>
      {dialogOpen && <ReassignAdviserDialog studentIds={selectedVisible} advisers={advisers} open={dialogOpen}
        onOpenChange={setDialogOpen} onConfirm={apply} />}
    </>
  )
}
