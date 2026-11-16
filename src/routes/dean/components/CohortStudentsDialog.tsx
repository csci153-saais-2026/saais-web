import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BatchCurriculumRow, CohortStudentSample } from "@/routes/dean/types"

export function CohortStudentsDialog({
  batch,
  students,
  open,
  onOpenChange,
  onOpenStudent,
}: {
  batch: BatchCurriculumRow | null
  students: CohortStudentSample[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenStudent?: (studentNumber: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Students behind this number</DialogTitle>
          <DialogDescription>
            {batch
              ? `Batch ${batch.batch} · ${batch.curriculum} (${batch.students} students)`
              : "Cohort student sample"}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-border bg-secondary/60 text-foreground">
          <AlertDescription>
            Opening this list is recorded in the audit log.
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">GWA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.studentNumber}>
                  <TableCell>
                    {onOpenStudent ? (
                      <button
                        type="button"
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => onOpenStudent(student.studentNumber)}
                      >
                        {student.name}
                      </button>
                    ) : (
                      <span className="font-medium">{student.name}</span>
                    )}
                    <div className="font-mono text-xs text-muted-foreground">
                      {student.studentNumber}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{student.gwa}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  No student samples available for this cohort.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

