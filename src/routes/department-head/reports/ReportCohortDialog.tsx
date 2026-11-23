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
import type { CohortStudent, CohortSummary } from "./report-model";

export function ReportCohortDialog({
  cohort,
  students,
  onClose,
}: {
  cohort: CohortSummary | null;
  students: CohortStudent[];
  onClose: () => void;
}) {
  return (
    <Dialog
      open={cohort !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Batch {cohort?.entryYear} · Student GWA</DialogTitle>
          <DialogDescription className="sr-only">
            Students in this cohort and their cumulative GWA.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="advisory">
          <AlertDescription>
            {students.length} students · {cohort?.program.toUpperCase()} · Study
            range {cohort?.entryYear}–{cohort ? cohort.entryYear + 4 : ""}
          </AlertDescription>
        </Alert>
        <div className="max-h-[50dvh] overflow-y-auto rounded-md border border-border">
          <Table responsive aria-label="Cohort student GWA">
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                  Student
                </TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                  Student ID
                </TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                  Curriculum
                </TableHead>
                <TableHead className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
                  GWA
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell label="Student" className="whitespace-normal">
                    {student.name}
                  </TableCell>
                  <TableCell label="Student ID">
                    {student.studentNumber}
                  </TableCell>
                  <TableCell label="Curriculum">{student.curriculum}</TableCell>
                  <TableCell label="GWA">{student.gwa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          All students in this cohort are shown.
        </p>
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
