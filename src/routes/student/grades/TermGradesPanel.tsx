import { ChevronDownIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { StatusBadge, type Status } from "@/components/ui/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ApiSchema } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export type TermGradesAttemptRow = ApiSchema<"AttemptResult"> & {
  readonly code?: string | null
  readonly title?: string | null
}

export type TermGradesSection = Omit<ApiSchema<"TermGrades">, "attempts"> & {
  readonly attempts: readonly TermGradesAttemptRow[]
  readonly is_locked?: boolean
  readonly failed_units?: number
}

export interface TermGradesPanelProps {
  readonly term: TermGradesSection
  readonly isLocked?: boolean
  readonly courseDetails?: Readonly<
    Record<
      string,
      {
        readonly code: string
        readonly title?: string | null
      }
    >
  >
  readonly openFlagAttemptIds?: ReadonlySet<string>
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
  readonly onFlagClick?: (
    attempt: TermGradesAttemptRow,
    meta: {
      readonly code: string
      readonly title: string
      readonly recordedGrade: string
      readonly reportedStage: "midterm" | "final"
    }
  ) => void
  readonly className?: string
}

const GRADES_COLUMNS = [
  { label: "Course", className: "md:w-[30%]" },
  { label: "Units", className: "md:w-[10%]" },
  { label: "Midterm", className: "md:w-[12%]" },
  { label: "Final / completion", className: "md:w-[18%]" },
  { label: "Status", className: "md:w-[16%]" },
  { label: "Flag", className: "md:w-[14%]" },
] as const

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

function formatDeadlineDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—"
  const trimmed = dateValue.trim()
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const monthIndex = Number(isoMatch[2]) - 1
    const day = Number(isoMatch[3])
    const monthLabel = SHORT_MONTHS[monthIndex]
    if (monthLabel && day >= 1 && day <= 31) {
      return `${day} ${monthLabel} ${year}`
    }
  }
  return trimmed
}

function mapAttemptStatusToBadge(attempt: TermGradesAttemptRow): Status {
  if (attempt.is_lapsed_inc) return "inc-lapsed"
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

function formatMidtermGrade(attempt: TermGradesAttemptRow): string {
  if (attempt.midterm_status === "dr") return "DR"
  if (attempt.midterm_grade != null) return attempt.midterm_grade.toFixed(2)
  return "—"
}

function formatFinalOrCompletionGrade(attempt: TermGradesAttemptRow): string {
  if (attempt.completion_grade != null) {
    return `${attempt.completion_grade.toFixed(2)} (INC)`
  }
  if (attempt.is_lapsed_inc) {
    return "INC (5.00)"
  }
  if (attempt.recorded_status === "inc") return "INC"
  if (attempt.recorded_status === "dr") return "DR"
  if (attempt.recorded_status === "na") return "NA"
  if (attempt.final_grade != null) return attempt.final_grade.toFixed(2)
  return "—"
}

function computeFailedUnits(attempts: readonly TermGradesAttemptRow[]): number {
  let failed = 0
  for (const attempt of attempts) {
    if (attempt.effective_status === "failed") {
      failed += attempt.units_attempted
    }
  }
  return failed
}

/**
 * Collapsible semester grade panel with term GWA, failed units, lock badge,
 * responsive attempts table, distinct `INC` vs `INC lapsed` badges, and grade-flag trigger.
 */
export function TermGradesPanel({
  term,
  isLocked,
  courseDetails,
  openFlagAttemptIds,
  open,
  onOpenChange,
  onFlagClick,
  className,
}: TermGradesPanelProps) {
  const locked = isLocked ?? term.is_locked ?? false
  const failedUnits = term.failed_units ?? computeFailedUnits(term.attempts)
  const gwaText = term.gwa === null ? "—" : term.gwa.toFixed(2)

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={open === undefined ? true : undefined}
      className={cn(
        "mb-4 overflow-hidden rounded-md border border-border bg-card",
        className
      )}
    >
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-4 bg-secondary px-5 py-4 text-left hover:bg-row-hover">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">
            {term.school_year} · {term.term_type}
          </span>
          <span className="mt-0.5 block text-caption text-muted-foreground">
            Term GWA {gwaText} · {failedUnits}{" "}
            {failedUnits === 1 ? "failed unit" : "failed units"} ·{" "}
            {locked ? "Locked term" : "Open term"}
          </span>
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90"
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        {term.attempts.length > 0 ? (
          <Table responsive className="md:table-fixed">
            <TableHeader className="bg-secondary">
              <TableRow>
                {GRADES_COLUMNS.map(({ label, className: colClass }) => (
                  <TableHead
                    key={label}
                    scope="col"
                    className={cn(
                      colClass,
                      "text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase"
                    )}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {term.attempts.map((attempt) => {
                const lookup = courseDetails?.[attempt.course_offering_id]
                const code =
                  attempt.code?.trim() ||
                  lookup?.code?.trim() ||
                  attempt.course_offering_id
                const title =
                  attempt.title?.trim() || lookup?.title?.trim() || ""
                const midtermText = formatMidtermGrade(attempt)
                const finalText = formatFinalOrCompletionGrade(attempt)
                const recordedGradeForFlag =
                  finalText !== "—"
                    ? finalText
                    : midtermText !== "—"
                      ? `mid ${midtermText}`
                      : "No grade yet"
                const reportedStage: "midterm" | "final" =
                  finalText === "—" && midtermText !== "—" ? "midterm" : "final"
                const badgeStatus = mapAttemptStatusToBadge(attempt)
                const isFlagged = openFlagAttemptIds?.has(attempt.id) ?? false
                const showIncDue =
                  attempt.effective_status === "inc" &&
                  !attempt.is_lapsed_inc &&
                  !!attempt.inc_deadline

                return (
                  <TableRow key={attempt.id} className="border-line-soft">
                    <TableCell
                      label="Course"
                      className="px-3.5 py-row text-cell whitespace-normal max-md:flex-col max-md:items-start max-md:gap-0.5 max-md:text-left"
                    >
                      <strong className="block font-semibold text-foreground">
                        {code}
                      </strong>
                      {title && (
                        <span className="block text-caption text-muted-foreground">
                          {title}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      label="Units"
                      className="px-3.5 py-row text-cell tabular-nums text-foreground"
                    >
                      {attempt.units_attempted}
                    </TableCell>
                    <TableCell
                      label="Midterm"
                      className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                    >
                      {midtermText}
                    </TableCell>
                    <TableCell
                      label="Final / completion"
                      className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                    >
                      {finalText}
                    </TableCell>
                    <TableCell label="Status" className="px-3.5 py-row text-cell">
                      <div className="flex flex-col items-end gap-1 md:items-start">
                        <StatusBadge status={badgeStatus} />
                        {showIncDue && (
                          <span className="text-caption text-muted-foreground">
                            Due {formatDeadlineDate(attempt.inc_deadline)}
                          </span>
                        )}
                        {attempt.is_repeated && (
                          <span className="text-caption text-muted-foreground">
                            Repeated
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell label="Flag" className="px-3.5 py-row text-cell">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={isFlagged}
                        className={cn(
                          "min-h-11 md:min-h-[38px]",
                          isFlagged &&
                            "border-notice-advisory-border bg-notice-advisory-bg text-notice-advisory hover:bg-notice-advisory-bg"
                        )}
                        onClick={() =>
                          onFlagClick?.(attempt, {
                            code,
                            title,
                            recordedGrade: recordedGradeForFlag,
                            reportedStage,
                          })
                        }
                      >
                        {isFlagged ? "Flagged" : "Flag Grade"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="px-5 py-8 text-center text-cell text-muted-foreground">
            No attempts recorded in this term.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
