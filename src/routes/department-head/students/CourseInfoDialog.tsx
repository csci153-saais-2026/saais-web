import { XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiSchema } from "@/lib/api";

export type CourseInfo = {
  /** `CODE · Title` */
  title: string;
  /** `3 units · Major · 1st Year, 1st Semester` */
  meta: string;
  status: Status;
  attempts: ApiSchema<"ChecklistSlotAttemptSummary">[];
  gradeFixes: ApiSchema<"GradeFixHistoryEntry">[];
};

const ATTEMPT_STATUS: Record<ApiSchema<"AttemptStatus">, Status> = {
  na: "na",
  failed: "failed",
  passed: "passed",
  inc: "inc",
  dr: "dr",
  currently_enrolled: "enrolled",
};
const HEADERS = [
  "Attempt",
  "Term",
  "Midterm",
  "Final",
  "Completion",
  "Instructor",
  "Result",
];
const grade = (value: number | null | undefined) =>
  value == null ? null : value.toFixed(2);

/** Read-only detail for one checklist requirement: status, every recorded attempt and grade fix history. */
export function CourseInfoDialog({
  course,
  onClose,
}: {
  course: CourseInfo;
  onClose: () => void;
}) {
  const { attempts, gradeFixes } = course;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0",
          attempts.length ? "sm:max-w-3xl" : "sm:max-w-md",
        )}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-5 pt-4.5 pb-4">
          <div>
            <DialogTitle>{course.title}</DialogTitle>
            <DialogDescription className="mt-1.5 text-[13px]">
              {course.meta}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8.5 shrink-0 text-muted-foreground"
              aria-label="Close"
            >
              <XIcon className="size-4.5" aria-hidden />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="p-5">
          <div className="flex items-center gap-2.5 text-sm">
            <span>Status:</span>
            <StatusBadge status={course.status} />
            <span className="text-muted-foreground">
              · {attempts.length}{" "}
              {attempts.length === 1 ? "attempt" : "attempts"}
            </span>
          </div>
          {attempts.length ? (
            <Table responsive className="mt-4">
              <TableHeader className="bg-secondary">
                <TableRow>
                  {HEADERS.map((header) => (
                    <TableHead
                      key={header}
                      className="px-3.5 text-[11.5px] font-semibold tracking-[0.09em] whitespace-nowrap text-muted-2 uppercase"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt, index) => (
                  <TableRow key={attempt.attempt_id}>
                    <TableCell label="Attempt" className="px-3.5 py-2.75">
                      {index + 1}
                    </TableCell>
                    <TableCell
                      label="Term"
                      className="px-3.5 py-2.75 whitespace-normal"
                    >
                      {attempt.term_label}
                    </TableCell>
                    <TableCell label="Midterm" className="px-3.5 py-2.75">
                      {grade(attempt.midterm_grade) ??
                        (attempt.midterm_status === "dr" ? "DR" : "—")}
                    </TableCell>
                    <TableCell label="Final" className="px-3.5 py-2.75">
                      {grade(attempt.final_grade) ?? "—"}
                    </TableCell>
                    <TableCell label="Completion" className="px-3.5 py-2.75">
                      {grade(attempt.completion_grade) ?? "—"}
                    </TableCell>
                    <TableCell label="Instructor" className="px-3.5 py-2.75">
                      {attempt.instructor || "—"}
                    </TableCell>
                    <TableCell label="Result" className="px-3.5 py-2.75">
                      <StatusBadge
                        status={ATTEMPT_STATUS[attempt.effective_status]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="mt-4 text-[13.5px] text-muted-foreground">
              No attempts recorded yet.
            </p>
          )}
          <h3 className="mt-5.5 text-[15.5px] font-semibold">
            Grade fix history
          </h3>
          {gradeFixes.length ? (
            <ul className="mt-2.5 grid gap-1.5 text-[13.5px] text-muted-foreground">
              {gradeFixes.map((entry, index) => (
                <li key={`${entry.changed_at}:${index}`}>
                  {new Date(entry.changed_at).toLocaleString()} ·{" "}
                  {entry.old_grade ?? "—"} → {entry.new_grade ?? "—"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              No grade fixes recorded.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
