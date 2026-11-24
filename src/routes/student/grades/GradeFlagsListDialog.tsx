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
import type { ApiSchema } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export type GradeFlagDisplayItem = ApiSchema<"GradeFlag"> & {
  readonly course_code?: string | null;
  readonly course_title?: string | null;
  readonly term_label?: string | null;
};

export interface GradeFlagAttemptMeta {
  readonly code: string;
  readonly title?: string | null;
  readonly termLabel?: string | null;
}

export interface GradeFlagsListDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly flags: readonly GradeFlagDisplayItem[];
  readonly attemptMeta?: Readonly<Record<string, GradeFlagAttemptMeta>>;
  readonly className?: string;
}

const ISSUE_TYPE_LABELS: Readonly<
  Record<ApiSchema<"GradeFlag">["issue_type"], string>
> = {
  wrong_grade: "Wrong grade",
  incorrect_grade: "Incorrect grade",
  missing_grade: "Missing grade",
  wrong_course_credited: "Wrong course credited",
  wrong_status: "Wrong status",
  missing_completion: "Missing completion",
  other: "Other",
};

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

function formatFlagDate(dateValue: string | null | undefined): string {
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

function getFlagBadgeConfig(status: ApiSchema<"GradeFlag">["status"]): {
  badgeStatus: Status;
  label: string;
} {
  switch (status) {
    case "corrected":
      return { badgeStatus: "passed", label: "Corrected" };
    case "rejected":
      return { badgeStatus: "failed", label: "Rejected" };
    case "open":
    default:
      return { badgeStatus: "inc", label: "Under review" };
  }
}

/**
 * Student Grades modal listing submitted grade flags, their current review status,
 * and adviser resolution notes.
 */
export function GradeFlagsListDialog({
  open,
  onOpenChange,
  flags,
  attemptMeta,
  className,
}: GradeFlagsListDialogProps) {
  const sortedFlags = React.useMemo(() => {
    return [...flags].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || ""),
    );
  }, [flags]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[90dvh] overflow-y-auto sm:max-w-[680px]",
          className,
        )}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle>Grade flags</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              Track grade concerns you submitted and your adviser&apos;s
              responses.
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

        {sortedFlags.length > 0 ? (
          <div
            data-slot="grade-flags-list"
            className="divide-y divide-line-soft overflow-hidden rounded-md border border-border bg-card"
          >
            {sortedFlags.map((flag) => {
              const meta = attemptMeta?.[flag.attempt_id];
              const code =
                flag.course_code?.trim() ||
                meta?.code?.trim() ||
                flag.attempt_id;
              const title =
                flag.course_title?.trim() || meta?.title?.trim() || null;
              const termLabel =
                flag.term_label?.trim() || meta?.termLabel?.trim() || null;
              const issueLabel =
                ISSUE_TYPE_LABELS[flag.issue_type] ?? flag.issue_type;
              const filedDate = formatFlagDate(flag.created_at);
              const { badgeStatus, label } = getFlagBadgeConfig(flag.status);

              return (
                <article
                  key={flag.id}
                  data-slot="grade-flag-row"
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-1.5 text-cell text-foreground">
                      <strong className="font-mono font-semibold tabular-nums">
                        {code}
                      </strong>
                      {title && (
                        <>
                          <span aria-hidden="true" className="text-muted-2">
                            ·
                          </span>
                          <span
                            className="max-w-full truncate font-semibold"
                            title={title}
                          >
                            {title}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="mt-1 text-caption text-muted-foreground">
                      {termLabel && (
                        <>
                          <span className="tabular-nums">{termLabel}</span>
                          <span aria-hidden="true"> · </span>
                        </>
                      )}
                      <span>{issueLabel}</span>
                      {flag.reported_grade_text && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>
                            recorded grade{" "}
                            <span className="font-mono tabular-nums">
                              {flag.reported_grade_text}
                            </span>
                          </span>
                        </>
                      )}
                      <span aria-hidden="true"> · </span>
                      <span>
                        Filed{" "}
                        <time
                          dateTime={flag.created_at}
                          className="font-mono tabular-nums"
                        >
                          {filedDate}
                        </time>
                      </span>
                    </p>

                    <p className="mt-2 text-cell whitespace-pre-wrap text-foreground wrap-anywhere">
                      {flag.details}
                    </p>

                    {(flag.status === "corrected" ||
                      flag.status === "rejected") && (
                      <p className="mt-2 text-cell text-muted-foreground wrap-anywhere">
                        <strong className="font-semibold text-foreground">
                          Adviser:
                        </strong>{" "}
                        {flag.status === "corrected" ? (
                          <>
                            {flag.corrected_grade != null ? (
                              <>
                                grade corrected to{" "}
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {flag.corrected_grade.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              "grade record updated"
                            )}
                            {flag.resolution_note
                              ? ` · ${flag.resolution_note}`
                              : ""}
                          </>
                        ) : (
                          flag.resolution_note || "The recorded grade stands."
                        )}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={badgeStatus}>{label}</StatusBadge>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card px-5 py-10 text-center text-body text-muted-foreground">
            No grade flags submitted yet.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
