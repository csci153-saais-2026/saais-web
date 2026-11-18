import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DeanStudentSummary } from "@/routes/dean/types"

export function StudentDirectoryTable({
  students,
  totalCount,
  onSelectStudent,
  onResetFilters,
}: {
  students: DeanStudentSummary[]
  totalCount: number
  onSelectStudent: (student: DeanStudentSummary) => void
  onResetFilters?: () => void
}) {
  const countLabel =
    students.length === totalCount
      ? `${students.length} ${students.length === 1 ? "student" : "students"}`
      : `Showing ${students.length} of ${totalCount} students`

  return (
    <Panel
      title="Faculty student roster"
      description={countLabel}
      action={
        <span
          aria-live="polite"
          className="font-mono text-xs text-muted-foreground"
        >
          {students.length} {students.length === 1 ? "student" : "students"}
        </span>
      }
      flush
    >
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Student no.</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Curriculum</TableHead>
            <TableHead>Adviser</TableHead>
            <TableHead>Standing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length > 0 ? (
            students.map((student) => (
              <TableRow
                key={student.studentNumber}
                tabIndex={0}
                role="button"
                aria-label={`Open record for ${student.name}`}
                className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelectStudent(student)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onSelectStudent(student)
                  }
                }}
              >
                <TableCell label="Student" className="font-medium text-primary">
                  {student.name}
                </TableCell>
                <TableCell label="Student no." className="font-mono text-xs">
                  {student.studentNumber}
                </TableCell>
                <TableCell label="Department">{student.department}</TableCell>
                <TableCell label="Curriculum">{student.curriculum}</TableCell>
                <TableCell label="Adviser">{student.adviser}</TableCell>
                <TableCell label="Standing">
                  <StatusBadge status={student.standing} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-3">
                  <span>No students match these filters.</span>
                  {onResetFilters && (
                    <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
                      Reset filters
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Panel>
  )
}
