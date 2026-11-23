import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BatchCurriculumRow,
  CohortStudentSample,
} from "@/routes/dean/types";

export function CohortStudentsDialog({
  batch,
  students,
  open,
  onOpenChange,
  onOpenStudent,
}: {
  batch: BatchCurriculumRow | null;
  students: CohortStudentSample[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStudent?: (studentId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {batch
              ? `Batch ${batch.batch} · Student GWA`
              : "Batch · Student GWA"}
          </DialogTitle>
          <DialogDescription>
            {batch
              ? `${batch.curriculum} · ${batch.students} ${batch.students === 1 ? "student" : "students"}`
              : "Cohort student list"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead className="text-right">GWA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell title={student.name} className="max-w-56 truncate">
                      {onOpenStudent ? (
                        <button
                          type="button"
                          className="max-w-full truncate text-left font-semibold text-primary underline"
                          onClick={() => onOpenStudent(student.studentId)}
                        >
                          {student.name}
                        </button>
                      ) : (
                        <span className="font-semibold">{student.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {student.studentNumber}
                    </TableCell>
                    <TableCell>{student.curriculum}</TableCell>
                    <TableCell className="text-right font-mono">
                      {student.gwa}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No students match this cohort.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
