import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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

export type CohortStudentRow = {
  id: string;
  name: string;
  studentNumber: string;
  curriculum: string;
  /** Pre-formatted, e.g. "1.92". */
  gwa: string;
};

const HEAD =
  "text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase";

/**
 * Presentational "Batch YYYY · Student GWA" modal shared by the Dean and Department Head
 * reports: advisory summary line, Student / Student ID / Curriculum / GWA table and a Close
 * footer. Fetching and formatting stay with the caller.
 */
function CohortStudentsDialog({
  open,
  onOpenChange,
  title,
  description = "Students in this cohort and their cumulative GWA.",
  summary,
  students,
  onOpenStudent,
  onCloseAutoFocus,
  emptyMessage = "No students match this cohort.",
  footnote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Batch 2025 · Student GWA". */
  title: string;
  /** Screen-reader description. */
  description?: string;
  /** Advisory line above the table, e.g. "108 students · BSCS · Study range 2025–2029". */
  summary?: React.ReactNode;
  students: readonly CohortStudentRow[];
  /** When set, student names render as links that open that student's record. */
  onOpenStudent?: (studentId: string) => void;
  /** Restore focus to the caller's opener when there is no DialogTrigger. */
  onCloseAutoFocus?: React.ComponentProps<
    typeof DialogContent
  >["onCloseAutoFocus"];
  emptyMessage?: React.ReactNode;
  /** Small caption under the table, e.g. "All students in this cohort are shown." */
  footnote?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <Alert variant="advisory">
            <AlertDescription>{summary}</AlertDescription>
          </Alert>
        )}

        <div className="max-h-[50dvh] overflow-y-auto rounded-md border border-border">
          <Table responsive aria-label="Cohort student GWA">
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow>
                <TableHead className={HEAD}>Student</TableHead>
                <TableHead className={HEAD}>Student ID</TableHead>
                <TableHead className={HEAD}>Curriculum</TableHead>
                <TableHead className={HEAD}>GWA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell label="Student">
                      {onOpenStudent ? (
                        <button
                          type="button"
                          title={student.name}
                          className="block max-w-56 truncate text-left font-semibold text-primary underline"
                          onClick={() => onOpenStudent(student.id)}
                        >
                          {student.name}
                        </button>
                      ) : (
                        <span
                          title={student.name}
                          className="block max-w-56 truncate"
                        >
                          {student.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell label="Student ID" className="font-mono text-xs">
                      {student.studentNumber}
                    </TableCell>
                    <TableCell label="Curriculum">
                      {student.curriculum}
                    </TableCell>
                    <TableCell label="GWA" className="font-mono">
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
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {footnote && (
          <p className="text-xs text-muted-foreground">{footnote}</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CohortStudentsDialog };
