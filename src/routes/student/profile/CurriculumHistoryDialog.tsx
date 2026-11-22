import * as React from "react";
import { Button } from "@/components/ui/button";
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
import type { ApiSchema } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface CurriculumHistoryDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly assignments: readonly ApiSchema<"StudentCurriculumAssignment">[];
  readonly transfers?: readonly ApiSchema<"CurriculumTransferRequest">[];
  /** Map from `curriculum_version_id` to human-readable `version_label`. */
  readonly curriculumLabels?: Readonly<Record<string, string>>;
  readonly className?: string;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatShortDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—";
  const trimmed = dateValue.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const monthLabel = SHORT_MONTHS[monthIndex];
    if (monthLabel && day >= 1 && day <= 31) {
      return `${day} ${monthLabel} ${year}`;
    }
  }
  return trimmed;
}

interface CurriculumHistoryRow {
  readonly id: string;
  readonly curriculum: string;
  readonly from: string;
  readonly to: string;
  readonly status: Status;
  readonly statusLabel?: string;
  readonly note: string;
}

/**
 * Student Profile modal rendering the student's curriculum version assignments
 * and any pending or decided curriculum transfer requests.
 */
export function CurriculumHistoryDialog({
  open,
  onOpenChange,
  assignments,
  transfers = [],
  curriculumLabels,
  className,
}: CurriculumHistoryDialogProps) {
  const rows = React.useMemo<CurriculumHistoryRow[]>(() => {
    const resolveCurriculum = (versionId: string) =>
      curriculumLabels?.[versionId]?.trim() || versionId;

    const sortedAssignments = [...assignments].sort((a, b) => {
      const aCurrent = a.end_date == null;
      const bCurrent = b.end_date == null;
      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
      return (b.start_date || "").localeCompare(a.start_date || "");
    });

    const assignmentRows: CurriculumHistoryRow[] = sortedAssignments.map(
      (assignment) => {
        const isCurrent = assignment.end_date == null;
        return {
          id: `assignment-${assignment.id}`,
          curriculum: resolveCurriculum(assignment.curriculum_version_id),
          from: formatShortDate(assignment.start_date),
          to: isCurrent ? "Present" : formatShortDate(assignment.end_date),
          status: isCurrent ? "current" : "archived",
          note:
            assignment.change_note?.trim() ||
            (isCurrent ? "Current curriculum" : "Previous curriculum"),
        };
      },
    );

    const transferRows: CurriculumHistoryRow[] = transfers
      .filter((t) => t.status !== "approved")
      .map((transfer) => {
        const isRejected = transfer.status === "rejected";
        const endorser =
          transfer.endorsed_by_name?.trim() || "Academic Adviser";
        const noteParts: string[] = [];
        if (isRejected) {
          noteParts.push("Transfer rejected");
          if (transfer.decided_at) {
            noteParts.push(formatShortDate(transfer.decided_at));
          }
          if (transfer.decision_note) {
            noteParts.push(transfer.decision_note);
          }
        } else {
          noteParts.push(
            `Endorsed by ${endorser}, waiting for Department Head`,
          );
        }

        return {
          id: `transfer-${transfer.id}`,
          curriculum: resolveCurriculum(transfer.to_curriculum_version_id),
          from: formatShortDate(transfer.created_at),
          to: isRejected ? "Not applied" : "Pending",
          status: isRejected ? "failed" : "inc",
          statusLabel: isRejected ? "Rejected" : "Pending",
          note: noteParts.join(" · "),
        };
      });

    return [...assignmentRows, ...transferRows];
  }, [assignments, transfers, curriculumLabels]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn("sm:max-w-[760px]", className)}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle>Curriculum history</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              The curriculum versions you have followed, and any transfer in
              progress.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              Close
            </Button>
          </DialogClose>
        </DialogHeader>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <Table responsive>
              <TableHeader className="bg-secondary">
                <TableRow>
                  {["Curriculum", "From", "To", "Status", "Note"].map(
                    (header) => (
                      <TableHead
                        key={header}
                        scope="col"
                        className="px-3.5 text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase"
                      >
                        {header}
                      </TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="border-line-soft">
                    <TableCell
                      label="Curriculum"
                      className="px-3.5 py-row text-cell font-medium text-foreground"
                    >
                      {row.curriculum}
                    </TableCell>
                    <TableCell
                      label="From"
                      className="px-3.5 py-row text-cell tabular-nums text-foreground"
                    >
                      {row.from}
                    </TableCell>
                    <TableCell
                      label="To"
                      className="px-3.5 py-row text-cell tabular-nums text-foreground"
                    >
                      {row.to}
                    </TableCell>
                    <TableCell
                      label="Status"
                      className="px-3.5 py-row text-cell"
                    >
                      <StatusBadge status={row.status}>
                        {row.statusLabel}
                      </StatusBadge>
                    </TableCell>
                    <TableCell
                      label="Note"
                      className="px-3.5 py-row text-caption whitespace-normal text-muted-foreground"
                    >
                      {row.note}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-6 text-center text-cell text-muted-foreground">
            No curriculum history recorded yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
