import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/** Status vocabulary from the design system: every badge pairs a dot with a text label. */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current before:content-['']",
  {
    variants: {
      status: {
        passed: "bg-status-pass-bg text-status-pass",
        failed: "bg-status-fail-bg text-status-fail",
        inc: "bg-status-inc-bg text-status-inc",
        "inc-lapsed": "bg-status-fail-bg text-status-inc",
        enrolled: "bg-status-enrolled-bg text-status-enrolled",
        dropped: "bg-status-neutral-bg text-status-neutral",
        "no-attendance": "bg-status-neutral-bg text-status-neutral",
        "not-taken": "bg-status-neutral-bg text-status-neutral",
        good: "bg-status-pass-bg text-status-pass",
        flagged: "bg-status-fail-bg text-status-fail",
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
  dropped: "Dropped",
  "no-attendance": "No attendance",
  "not-taken": "Not taken",
  good: "Good standing",
  flagged: "Flagged",
  active: "Active",
  current: "Current",
  archived: "Archived",
  invited: "Invited",
  disabled: "Disabled",
}

function StatusBadge({
  className,
  status = "not-taken",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {children ?? statusLabels[status as Status]}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
