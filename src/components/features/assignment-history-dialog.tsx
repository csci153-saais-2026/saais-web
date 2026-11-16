import * as React from "react"
import type { ApiSchema } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
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
import { cn } from "@/lib/utils"

export type AdviserAssignmentRecord = ApiSchema<"AdviserAssignment"> & {
  /** Compatibility alias if caller passes `effective_from` instead of `start_date`. */
  readonly effective_from?: string
  /** Compatibility alias if caller passes `effective_to` instead of `end_date`. */
  readonly effective_to?: string | null
  /** Optional explicit note override. */
  readonly note?: string | null
}

export interface AssignmentHistoryDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly assignments: readonly AdviserAssignmentRecord[]
  /** Optional map or callback to resolve adviser display names from `adviser_id`. */
  readonly adviserNames?: Readonly<Record<string, string>> | ((adviserId: string) => string | undefined)
  readonly className?: string
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
] as const

function formatAssignmentDate(dateValue: string | null | undefined): string {
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

function resolveAdviserName(
  assignment: AdviserAssignmentRecord,
  adviserNames?: Readonly<Record<string, string>> | ((adviserId: string) => string | undefined)
): string {
  if (assignment.adviser_name && assignment.adviser_name.trim().length > 0) {
    return assignment.adviser_name
  }
  if (typeof adviserNames === "function") {
    const resolved = adviserNames(assignment.adviser_id)
    if (resolved && resolved.trim().length > 0) return resolved
  } else if (adviserNames && assignment.adviser_id in adviserNames) {
    const resolved = adviserNames[assignment.adviser_id]
    if (resolved && resolved.trim().length > 0) return resolved
  }
  return assignment.adviser_id
}

function resolveAssignmentNote(assignment: AdviserAssignmentRecord, isActive: boolean): string {
  if (assignment.note && assignment.note.trim().length > 0) {
    return assignment.note
  }
  if (assignment.handover_label && assignment.handover_label.trim().length > 0) {
    return assignment.handover_label
  }
  if (assignment.handed_over_to_name && assignment.handed_over_to_name.trim().length > 0) {
    return `Handed over to ${assignment.handed_over_to_name}`
  }
  if (isActive) {
    return "Current adviser"
  }
  return "—"
}

/**
 * Shared modal rendering a student's longitudinal, gap-free adviser assignment history.
 * Used by Student Dashboard ("View assignment history") and Student Profile.
 */
export function AssignmentHistoryDialog({
  open,
  onOpenChange,
  assignments,
  adviserNames,
  className,
}: AssignmentHistoryDialogProps) {
  const sortedAssignments = React.useMemo(() => {
    return [...assignments].sort((a, b) => {
      const aTo = a.effective_to !== undefined ? a.effective_to : a.end_date
      const bTo = b.effective_to !== undefined ? b.effective_to : b.end_date
      const aActive = aTo == null
      const bActive = bTo == null
      if (aActive !== bActive) return aActive ? -1 : 1

      const aFrom = (a.effective_from ?? a.start_date) || ""
      const bFrom = (b.effective_from ?? b.start_date) || ""
      return bFrom.localeCompare(aFrom)
    })
  }, [assignments])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-[720px]", className)}
      >
        <DialogHeader>
          <DialogTitle>Assignment history</DialogTitle>
          <DialogDescription className="text-body text-muted-foreground">
            Every adviser assigned to you, newest first. Past assignments stay on record.
          </DialogDescription>
        </DialogHeader>

        {sortedAssignments.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border bg-card">
            <Table responsive>
              <TableHeader className="bg-secondary">
                <TableRow>
                  {["Adviser", "From", "To", "Note"].map((header) => (
                    <TableHead
                      key={header}
                      scope="col"
                      className="px-3.5 py-2.5 text-kicker font-semibold text-muted-2 uppercase"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssignments.map((assignment) => {
                  const fromRaw = assignment.effective_from ?? assignment.start_date
                  const toRaw =
                    assignment.effective_to !== undefined
                      ? assignment.effective_to
                      : assignment.end_date
                  const isActive = toRaw == null
                  const adviserLabel = resolveAdviserName(assignment, adviserNames)
                  const fromLabel = formatAssignmentDate(fromRaw)
                  const toLabel = isActive ? "Present" : formatAssignmentDate(toRaw)
                  const noteLabel = resolveAssignmentNote(assignment, isActive)

                  return (
                    <TableRow key={assignment.id} className="border-line-soft">
                      <TableCell
                        label="Adviser"
                        className="px-3.5 py-row text-cell font-medium text-foreground"
                      >
                        {adviserLabel}
                      </TableCell>
                      <TableCell
                        label="From"
                        className="px-3.5 py-row text-cell tabular-nums text-foreground"
                      >
                        {fromLabel}
                      </TableCell>
                      <TableCell
                        label="To"
                        className="px-3.5 py-row text-cell tabular-nums text-foreground"
                      >
                        {toLabel}
                      </TableCell>
                      <TableCell
                        label="Note"
                        className="px-3.5 py-row text-caption text-muted-foreground whitespace-normal"
                      >
                        {noteLabel}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-6 text-center text-cell text-muted-foreground">
            No adviser assignments recorded yet.
          </p>
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
  )
}
