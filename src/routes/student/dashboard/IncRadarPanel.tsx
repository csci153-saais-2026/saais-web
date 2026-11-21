import * as React from "react"
import type { ApiSchema } from "@/lib/api/types"
import { Panel } from "@/components/features/panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type IncRadarDeficiencyItem = ApiSchema<"StudentDeficiencyItem"> & {
  /** Optional fallback if caller passes `code` instead of `course_code`. */
  readonly code?: string | null
  /** Optional fallback if caller passes `title` instead of `course_title`. */
  readonly title?: string | null
}

export interface IncRadarPanelProps {
  /** Open INC items or the full `AcademicSummary.deficiencies` array (automatically filtered to `open_inc`). */
  readonly deficiencies: readonly IncRadarDeficiencyItem[]
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

/**
 * Student Dashboard "Keep on your radar" panel.
 * Highlights open INC deficiencies with their completion deadline and `<StatusBadge status="inc" />`.
 */
export function IncRadarPanel({
  deficiencies,
  className,
}: IncRadarPanelProps) {
  const openIncItems = React.useMemo(() => {
    return deficiencies.filter((item) => item.kind === "open_inc")
  }, [deficiencies])

  const subtitle =
    openIncItems.length > 0
      ? `${openIncItems.length} incomplete ${
          openIncItems.length === 1 ? "course" : "courses"
        } to review`
      : "Nothing needs your attention"

  return (
    <Panel
      title="Keep on your radar"
      description={subtitle}
      flush={openIncItems.length > 0}
      className={cn(className)}
    >
      {openIncItems.length > 0 ? (
        <div
          data-slot="inc-radar-list"
          className="divide-y divide-line-soft"
        >
          {openIncItems.map((item, idx) => {
            const code =
              item.course_code?.trim() || item.code?.trim() || "Course"
            const title =
              item.course_title?.trim() || item.title?.trim() || null
            const deadlineLabel = formatDeadlineDate(item.inc_deadline)
            const noteText =
              item.detail?.trim() ||
              "Coordinate requirements with your instructor."

            return (
              <div
                key={item.attempt_id ?? `${code}-${idx}`}
                data-slot="inc-radar-row"
                className="flex items-start justify-between gap-3 px-5 py-3.5 text-cell"
              >
                <div className="min-w-0">
                  <strong className="block font-semibold text-foreground">
                    <span className="font-mono tabular-nums">{code}</span>
                    {title ? ` (${title})` : ""} · Completion due
                  </strong>
                  <p className="mt-1 text-caption text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      Due {deadlineLabel}
                    </span>
                    {item.days_remaining != null && (
                      <span className="font-mono tabular-nums">
                        {" "}
                        ({item.days_remaining}{" "}
                        {Math.abs(item.days_remaining) === 1 ? "day" : "days"}{" "}
                        remaining)
                      </span>
                    )}{" "}
                    · {noteText}
                  </p>
                </div>

                <StatusBadge status="inc" />
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-5 text-center text-body text-muted-foreground">
          No incomplete grades. Nice work.
        </p>
      )}
    </Panel>
  )
}
