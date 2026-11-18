import * as React from "react"
import {
  AlertIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  NoteIcon,
} from "@/components/icons"
import { Panel } from "@/components/features/panel"
import type { ApiSchema } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export type NotificationFilterTab = "all" | "unread"

export interface NotificationListItemProps {
  readonly notification: ApiSchema<"Notification">
  readonly onMarkRead?: (notificationId: string) => void
  readonly onSelect?: (notification: ApiSchema<"Notification">) => void
}

export interface NotificationListProps {
  readonly notifications: readonly ApiSchema<"Notification">[]
  readonly filter: NotificationFilterTab
  readonly onFilterChange: (filter: NotificationFilterTab) => void
  readonly onMarkRead?: (notificationId: string) => void
  readonly onSelectNotification?: (
    notification: ApiSchema<"Notification">
  ) => void
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

function formatNotificationTimestamp(dateValue: string): string {
  const trimmed = dateValue.trim()
  const isoMatch =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(trimmed)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const monthIndex = Number(isoMatch[2]) - 1
    const day = Number(isoMatch[3])
    const monthLabel = SHORT_MONTHS[monthIndex]
    if (monthLabel && day >= 1 && day <= 31) {
      if (isoMatch[4] && isoMatch[5]) {
        return `${day} ${monthLabel} ${year}, ${isoMatch[4]}:${isoMatch[5]}`
      }
      return `${day} ${monthLabel} ${year}`
    }
  }
  return trimmed
}

function NotificationTypeIcon({
  notification,
  className,
}: {
  notification: ApiSchema<"Notification">
  className?: string
}) {
  const event = String(notification.event_type ?? "")
  const kind = String(notification.kind ?? "")
  if (
    event.includes("lapsed") ||
    event.includes("standing") ||
    event.includes("delinquen") ||
    kind === "alert"
  ) {
    return <AlertIcon className={className} />
  }
  if (event.includes("deadline") || event.includes("inc")) {
    return <ClockIcon className={className} />
  }
  if (event.includes("approved") || event.includes("resolved")) {
    return <CheckIcon className={className} />
  }
  if (event.includes("note") || event.includes("flag")) {
    return <NoteIcon className={className} />
  }
  return <BellIcon className={className} />
}

/**
 * Single notification row with gold unread dot, explicit read/unread text state,
 * domain icon from `@/components/icons`, title, body, and tabular timestamp.
 */
export function NotificationListItem({
  notification,
  onMarkRead,
  onSelect,
}: NotificationListItemProps) {
  const unread = !notification.is_read
  const timestampLabel = formatNotificationTimestamp(notification.created_at)

  function handleClick() {
    if (unread) {
      onMarkRead?.(notification.id)
    }
    onSelect?.(notification)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex min-h-11 w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-row-hover",
        unread ? "bg-card" : "bg-background/40"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-2 size-2 shrink-0 rounded-full",
          unread ? "bg-gold" : "bg-transparent"
        )}
      />

      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-secondary text-primary"
      >
        <NotificationTypeIcon notification={notification} className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <strong
            className={cn(
              "text-cell text-foreground",
              unread ? "font-semibold" : "font-medium"
            )}
          >
            {notification.title}
          </strong>
          <span className="flex items-center gap-2 text-caption text-muted-2">
            <span>{unread ? "Unread" : "Read"}</span>
            <span aria-hidden="true">·</span>
            <time
              dateTime={notification.created_at}
              className="font-mono tabular-nums"
            >
              {timestampLabel}
            </time>
          </span>
        </span>
        <span className="mt-1 block text-cell text-muted-foreground">
          {notification.body}
        </span>
      </span>
    </button>
  )
}

/**
 * Student Notifications list with accessible `All` / `Unread ({count})` filter tabs
 * (`2px` gold active underline) and click-to-mark-read rows.
 */
export function NotificationList({
  notifications,
  filter,
  onFilterChange,
  onMarkRead,
  onSelectNotification,
  className,
}: NotificationListProps) {
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  )

  const filteredNotifications = React.useMemo(() => {
    const sorted = [...notifications].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || "")
    )
    if (filter === "unread") {
      return sorted.filter((n) => !n.is_read)
    }
    return sorted
  }, [notifications, filter])

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault()
      onFilterChange(filter === "all" ? "unread" : "all")
    }
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div
        role="tablist"
        aria-label="Filter notifications"
        className="flex gap-6 border-b border-border"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => onFilterChange("all")}
          onKeyDown={handleTabKeyDown}
          className={cn(
            "-mb-px min-h-11 border-b-2 px-1 py-2.5 text-cell transition-colors md:min-h-[38px]",
            filter === "all"
              ? "border-gold font-semibold text-foreground"
              : "border-transparent font-normal text-muted-2 hover:text-foreground"
          )}
        >
          All
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={filter === "unread"}
          onClick={() => onFilterChange("unread")}
          onKeyDown={handleTabKeyDown}
          className={cn(
            "-mb-px min-h-11 border-b-2 px-1 py-2.5 text-cell transition-colors md:min-h-[38px]",
            filter === "unread"
              ? "border-gold font-semibold text-foreground"
              : "border-transparent font-normal text-muted-2 hover:text-foreground"
          )}
        >
          Unread (<span className="font-mono tabular-nums">{unreadCount}</span>)
        </button>
      </div>

      <Panel
        title="Recent updates"
        description={
          unreadCount > 0
            ? `${unreadCount} unread ${
                unreadCount === 1 ? "notification" : "notifications"
              }`
            : "All notifications read"
        }
        flush
      >
        {filteredNotifications.length > 0 ? (
          <ul
            data-slot="notification-list"
            className="divide-y divide-line-soft"
          >
            {filteredNotifications.map((notification) => (
              <li key={notification.id}>
                <NotificationListItem
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onSelect={onSelectNotification}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-body text-muted-foreground">
            {filter === "unread"
              ? "No unread notifications right now."
              : "You are all caught up."}
          </p>
        )}
      </Panel>
    </div>
  )
}
