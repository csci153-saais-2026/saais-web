import { Panel } from "@/components/features/panel"
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
import type { EnrollmentHistoryOfferingDetail } from "./student-enrollment-history.api"

export type EnrollmentHistoryRow = ApiSchema<"AttemptResult"> & {
  readonly course_code?: string | null
  readonly course_title?: string | null
  readonly school_term_label?: string | null
  readonly provenance_slot_code?: string | null
}

export interface EnrollmentHistoryTableProps {
  readonly attempts: readonly EnrollmentHistoryRow[]
  readonly offeringDetails?: Readonly<
    Record<string, EnrollmentHistoryOfferingDetail>
  >
  readonly slotLabels?: Readonly<Record<string, string>>
  readonly className?: string
}

function mapAttemptStatusToBadge(attempt: EnrollmentHistoryRow): Status {
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

function formatAttemptGrade(attempt: EnrollmentHistoryRow): string {
  if (attempt.completion_grade != null) {
    return attempt.completion_grade.toFixed(2)
  }
  if (attempt.final_grade != null) {
    return attempt.final_grade.toFixed(2)
  }
  if (attempt.is_lapsed_inc) {
    return "5.00"
  }
  return "—"
}

/**
 * Responsive enrollment history table listing every course attempt chronologically,
 * with `data-label` mobile card-stacking and `font-mono tabular-nums` codes, grades, and provenance.
 */
export function EnrollmentHistoryTable({
  attempts,
  offeringDetails,
  slotLabels,
  className,
}: EnrollmentHistoryTableProps) {
  return (
    <Panel
      title="All course enrollments"
      description="An attempt is one student’s record for one course offering."
      flush
      className={cn(className)}
    >
      {attempts.length > 0 ? (
        <Table responsive>
          <TableHeader className="bg-secondary">
            <TableRow>
              {["Course", "School term", "Status", "Grade", "Provenance"].map(
                (header) => (
                  <TableHead
                    key={header}
                    scope="col"
                    className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase"
                  >
                    {header}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((attempt) => {
              const offering = offeringDetails?.[attempt.course_offering_id]
              const code =
                attempt.course_code?.trim() ||
                offering?.code?.trim() ||
                attempt.course_offering_id
              const title =
                attempt.course_title?.trim() || offering?.title?.trim() || ""
              const termLabel =
                attempt.school_term_label?.trim() ||
                offering?.termLabel?.trim() ||
                "—"
              const badgeStatus = mapAttemptStatusToBadge(attempt)
              const gradeDisplay = formatAttemptGrade(attempt)
              const provenanceCode =
                attempt.provenance_slot_code?.trim() ||
                (attempt.curriculum_term_course_id
                  ? slotLabels?.[attempt.curriculum_term_course_id]?.trim()
                  : undefined) ||
                null

              return (
                <TableRow key={attempt.id} className="border-line-soft">
                  <TableCell
                    label="Course"
                    className="px-3.5 py-row text-cell whitespace-normal text-foreground"
                  >
                    <span className="font-mono font-semibold tabular-nums">
                      {code}
                    </span>
                    {title && (
                      <span className="text-foreground"> — {title}</span>
                    )}
                  </TableCell>
                  <TableCell
                    label="School term"
                    className="px-3.5 py-row text-cell tabular-nums text-foreground"
                  >
                    {termLabel}
                  </TableCell>
                  <TableCell label="Status" className="px-3.5 py-row text-cell">
                    <StatusBadge status={badgeStatus} />
                  </TableCell>
                  <TableCell
                    label="Grade"
                    className="px-3.5 py-row font-mono text-cell tabular-nums text-foreground"
                  >
                    {gradeDisplay}
                  </TableCell>
                  <TableCell
                    label="Provenance"
                    className={cn(
                      "px-3.5 py-row text-cell",
                      provenanceCode
                        ? "font-mono tabular-nums text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {provenanceCode ?? "No direct slot"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="px-5 py-10 text-center text-body text-muted-foreground">
          No enrollment attempts recorded yet.
        </p>
      )}
    </Panel>
  )
}
