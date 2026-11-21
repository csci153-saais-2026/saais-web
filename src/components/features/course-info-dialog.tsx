import * as React from "react"
import type { ApiSchema } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge, type Status } from "@/components/ui/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type CourseInfoAttemptRecord = ApiSchema<"ChecklistSlotAttemptSummary"> & {
  /** Optional flag when an INC attempt has lapsed (evaluates as 5.00 while keeping INC status). */
  readonly is_lapsed_inc?: boolean
}

export type CourseInfoSlotRecord = Omit<ApiSchema<"ChecklistSlotResult">, "attempts"> & {
  readonly attempts?: readonly CourseInfoAttemptRecord[]
  /** Optional display code for the requirement slot (e.g. "CSIT 100" or "CS Elective 1"). */
  readonly code?: string | null
  /** Optional display title for the requirement slot. */
  readonly title?: string | null
  /** Optional metadata subtitle (e.g. "3 units · Major · 1st Year, 1st Semester"). */
  readonly meta?: string | null
  /** Optional flag when the slot's active attempt is a lapsed INC. */
  readonly is_lapsed_inc?: boolean
}

export interface CourseInfoDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly slot: CourseInfoSlotRecord | null
  /** Optional dialog heading override (defaults to `code · title` or credited course info). */
  readonly title?: string
  /** Optional subtitle metadata override (defaults to `slot.meta` or required units summary). */
  readonly meta?: string
  readonly className?: string
}

const EXCEPTION_SOURCES: ReadonlySet<string> = new Set([
  "Elective mapping",
  "Transfer equivalency",
  "Discontinued equivalency",
  "Outside credit",
])

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
] as const

function formatShortDate(dateValue: string | null | undefined): string {
  if (!dateValue) return ""
  const trimmed = dateValue.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const monthIndex = Number(isoMatch[2]) - 1
    const day = String(Number(isoMatch[3])).padStart(2, "0")
    const monthLabel = SHORT_MONTHS[monthIndex]
    if (monthLabel) {
      return `${day} ${monthLabel} ${year}`
    }
  }
  return trimmed
}

function formatGradeValue(grade: number | string | null | undefined): string {
  if (grade === null || grade === undefined || grade === "") return "—"
  if (typeof grade === "number") {
    return grade.toFixed(2)
  }
  return String(grade)
}

function mapSlotStatusToBadge(
  status: ApiSchema<"ChecklistSlotResult">["status"],
  isLapsedInc?: boolean
): Status {
  if (status === "inc" && isLapsedInc) return "inc-lapsed"
  switch (status) {
    case "passed":
      return "passed"
    case "failed":
      return "failed"
    case "inc":
      return "inc"
    case "currently_enrolled":
      return "enrolled"
    case "dr":
      return "dr"
    case "na":
      return "na"
    case "not_taken":
    default:
      return "not-taken"
  }
}

function mapAttemptStatusToBadge(attempt: CourseInfoAttemptRecord): Status {
  if (
    attempt.is_lapsed_inc ||
    (attempt.recorded_status === "inc" &&
      attempt.effective_status === "failed" &&
      attempt.completion_grade == null)
  ) {
    return "inc-lapsed"
  }
  switch (attempt.effective_status) {
    case "passed":
      return "passed"
    case "failed":
      return "failed"
    case "inc":
      return "inc"
    case "currently_enrolled":
      return "enrolled"
    case "dr":
      return "dr"
    case "na":
    default:
      return "na"
  }
}

function formatMidtermCell(attempt: CourseInfoAttemptRecord): string {
  if (attempt.midterm_status === "dr") return "DR"
  if (attempt.midterm_grade != null) return attempt.midterm_grade.toFixed(2)
  return "—"
}

function formatFinalCell(attempt: CourseInfoAttemptRecord): string {
  if (attempt.recorded_status === "inc") return "INC"
  if (attempt.recorded_status === "dr") return "DR"
  if (attempt.recorded_status === "na") return "NA"
  if (attempt.final_grade != null) return attempt.final_grade.toFixed(2)
  return "—"
}

function formatCompletionCell(attempt: CourseInfoAttemptRecord): string {
  if (attempt.completion_grade != null) {
    return attempt.completion_grade.toFixed(2)
  }
  return "—"
}

function formatGradeFixEntry(entry: ApiSchema<"GradeFixHistoryEntry">): string {
  const datePart = formatShortDate(entry.changed_at)
  const actorPart = entry.actor_name?.trim() || ""
  if (entry.summary && entry.summary.trim().length > 0) {
    const prefix = [datePart, actorPart].filter(Boolean).join(" · ")
    return prefix ? `${prefix} · ${entry.summary.trim()}` : entry.summary.trim()
  }
  const oldVal = formatGradeValue(entry.old_grade)
  const newVal = formatGradeValue(entry.new_grade)
  const changePart = `grade fixed ${oldVal} → ${newVal}`
  return [datePart, actorPart, changePart].filter(Boolean).join(" · ")
}

/**
 * Shared Course Info modal displaying a checklist slot's status, satisfaction source
 * (with GOLD_DP exception provenance), attempt history table, and grade fix history.
 */
export function CourseInfoDialog({
  open,
  onOpenChange,
  slot,
  title,
  meta,
  className,
}: CourseInfoDialogProps) {
  const attempts = slot?.attempts ?? []
  const gradeFixes = slot?.grade_fix_history ?? []

  const resolvedTitle = React.useMemo(() => {
    if (title && title.trim().length > 0) return title.trim()
    if (!slot) return "Course information"
    const code = slot.code ?? slot.credited_course_code
    const courseTitle = slot.title ?? slot.credited_course_title
    if (code && courseTitle) return `${code} · ${courseTitle}`
    if (code) return code
    if (courseTitle) return courseTitle
    return "Course information"
  }, [slot, title])

  const resolvedMeta = React.useMemo(() => {
    if (meta && meta.trim().length > 0) return meta.trim()
    if (!slot) return ""
    if (slot.meta && slot.meta.trim().length > 0) return slot.meta.trim()
    return `${slot.earned_units} / ${slot.required_units} units`
  }, [slot, meta])

  const isExceptionSource =
    !!slot?.satisfaction_source && EXCEPTION_SOURCES.has(slot.satisfaction_source)

  const badgeStatus = slot
    ? mapSlotStatusToBadge(slot.status, slot.is_lapsed_inc)
    : "not-taken"

  const sourceLine = React.useMemo(() => {
    if (!slot) return null
    if (!slot.satisfaction_source) {
      return slot.status === "not_taken" ? "Not yet taken" : null
    }
    const creditedDetail = [slot.credited_course_code, slot.credited_course_title]
      .filter(Boolean)
      .join(" · ")
    return creditedDetail
      ? `${slot.satisfaction_source} (${creditedDetail})`
      : slot.satisfaction_source
  }, [slot])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn("sm:max-w-[720px]", className)}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle>{resolvedTitle}</DialogTitle>
            <DialogDescription className="text-body text-muted-foreground">
              {resolvedMeta || "Checklist requirement details and attempt record."}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" className="shrink-0">
              Close
            </Button>
          </DialogClose>
        </DialogHeader>

        {slot ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2 text-cell text-foreground">
              <span>Status:</span>
              <StatusBadge status={badgeStatus} />
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
              </span>
              {sourceLine && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    data-slot="satisfaction-source"
                    className={cn(
                      "text-cell",
                      isExceptionSource
                        ? "font-medium text-gold-deep"
                        : "text-muted-foreground"
                    )}
                  >
                    {sourceLine}
                  </span>
                </>
              )}
            </div>

            {attempts.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-border bg-card">
                <Table responsive>
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      {[
                        "Attempt",
                        "Term",
                        "Midterm",
                        "Final",
                        "Completion",
                        "Instructor",
                        "Result",
                      ].map((header) => (
                        <TableHead
                          key={header}
                          scope="col"
                          className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase"
                        >
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt, index) => {
                      const resultStatus = mapAttemptStatusToBadge(attempt)
                      return (
                        <TableRow key={attempt.attempt_id} className="border-line-soft">
                          <TableCell
                            label="Attempt"
                            className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                          >
                            {index + 1}
                          </TableCell>
                          <TableCell
                            label="Term"
                            className="px-3.5 py-row text-cell tabular-nums text-foreground"
                          >
                            {attempt.term_label}
                          </TableCell>
                          <TableCell
                            label="Midterm"
                            className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                          >
                            {formatMidtermCell(attempt)}
                          </TableCell>
                          <TableCell
                            label="Final"
                            className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                          >
                            {formatFinalCell(attempt)}
                          </TableCell>
                          <TableCell
                            label="Completion"
                            className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                          >
                            {formatCompletionCell(attempt)}
                          </TableCell>
                          <TableCell
                            label="Instructor"
                            className="px-3.5 py-row text-cell text-foreground"
                          >
                            {attempt.instructor?.trim() || "—"}
                          </TableCell>
                          <TableCell label="Result" className="px-3.5 py-row text-cell">
                            <StatusBadge status={resultStatus} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-md border border-border bg-card py-8 text-center text-cell text-muted-foreground">
                No attempts recorded yet.
              </p>
            )}

            <div>
              <h3 className="text-heading font-semibold text-foreground">
                Grade fix history
              </h3>
              {gradeFixes.length > 0 ? (
                <ul className="mt-2 grid gap-1.5 pl-4 text-cell text-muted-foreground list-disc">
                  {gradeFixes.map((fix, idx) => (
                    <li
                      key={`${fix.changed_at}-${idx}`}
                      className="tabular-nums"
                    >
                      {formatGradeFixEntry(fix)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-cell text-muted-foreground">
                  No grade fixes recorded.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-cell text-muted-foreground">
            No course selected.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
