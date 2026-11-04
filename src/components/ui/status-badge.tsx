import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { FlagIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

/**
 * Status vocabulary from the design system. Status is never conveyed by color alone:
 * every badge carries a text label, and each also carries a leading mark (a dot, or a flag
 * for delinquency/flag statuses) so the state is readable without seeing the color.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[3px] py-0.5 pr-[9px] pl-2 text-xs font-semibold tracking-[0.01em] whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      status: {
        // Grades and attempts
        passed: "bg-status-pass-bg text-status-pass",
        failed: "bg-status-fail-bg text-status-fail",
        inc: "bg-status-inc-bg text-status-inc",
        "inc-lapsed": "bg-status-fail-bg text-status-fail",
        enrolled: "bg-status-enrolled-bg text-status-enrolled",
        dr: "bg-status-neutral-bg text-status-neutral",
        na: "bg-status-neutral-bg text-status-neutral",
        "not-taken": "bg-status-neutral-bg text-status-neutral",
        // Standing and delinquency
        good: "bg-status-pass-bg text-status-pass",
        delinquent: "bg-status-fail-bg text-status-fail",
        flagged: "bg-status-fail-bg text-status-fail",
        // Account and record lifecycle
        active: "bg-status-pass-bg text-status-pass",
        current: "bg-status-pass-bg text-status-pass",
        archived: "bg-status-neutral-bg text-status-neutral",
        invited: "bg-status-enrolled-bg text-status-enrolled",
        disabled: "bg-status-neutral-bg text-status-neutral",
      },
    },
    defaultVariants: { status: "not-taken" },
  }
)

export type Status = NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>

export const statusLabels: Record<Status, string> = {
  passed: "Passed",
  failed: "Failed",
  inc: "INC",
  "inc-lapsed": "INC lapsed",
  enrolled: "Enrolled",
  dr: "Dropped",
  na: "No attendance",
  "not-taken": "Not taken",
  good: "Good standing",
  delinquent: "Delinquent",
  flagged: "Flagged",
  active: "Active",
  current: "Current",
  archived: "Archived",
  invited: "Invited",
  disabled: "Disabled",
}

/** Statuses that show a flag glyph instead of a dot. */
const flagStatuses: ReadonlySet<Status> = new Set(["delinquent", "flagged"])

function StatusBadge({
  className,
  status = "not-taken",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  const key = (status ?? "not-taken") as Status
  return (
    <span
      data-slot="status-badge"
      data-status={key}
      className={cn(statusBadgeVariants({ status: key }), className)}
      {...props}
    >
      {flagStatuses.has(key) ? (
        <FlagIcon />
      ) : (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      )}
      {children ?? statusLabels[key]}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
