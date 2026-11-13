import * as React from "react"
import { Link, useOutletContext } from "react-router"
import { AlertIcon, NoteIcon, SwapIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { PageHeading } from "@/components/features/page-heading"
import { SampleFooter } from "@/components/features/sample-footer"
import { cn } from "@/lib/utils"
import type { DepartmentNotificationRecord, DepartmentNotificationsContext } from "./preview-data"

const KIND_ICONS: Record<
  DepartmentNotificationRecord["kind"],
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  transfer: SwapIcon,
  alert: AlertIcon,
  note: NoteIcon,
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } =
    useOutletContext<DepartmentNotificationsContext>()
  const [filter, setFilter] = React.useState<"all" | "unread">("all")

  const unreadCount = notifications.filter((n) => n.unread).length
  const shown =
    filter === "unread" ? notifications.filter((n) => n.unread) : notifications

  const subtitle =
    unreadCount > 0
      ? `${unreadCount} unread of ${notifications.length} notifications.`
      : "You are all caught up."

  return (
    <div className="space-y-6">
      <PageHeading
        title="Notifications"
        subtitle={subtitle}
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={unreadCount === 0}
            onClick={markAllNotificationsRead}
          >
            Mark all as read
          </Button>
        }
      />

      <div
        className="inline-flex rounded-lg border border-border bg-card p-1"
        role="group"
        aria-label="Filter notifications"
      >
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-md px-4 py-1.5 text-[13.5px] font-semibold transition-colors",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={filter === "unread"}
          onClick={() => setFilter("unread")}
          className={cn(
            "rounded-md px-4 py-1.5 text-[13.5px] font-semibold transition-colors",
            filter === "unread"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </button>
      </div>

      <section
        aria-live="polite"
        className="overflow-hidden rounded-md border border-border bg-card"
      >
        {shown.length === 0 ? (
          <div className="px-5 py-11 text-center text-sm text-muted-foreground">
            {filter === "unread" ? "No unread notifications." : "No notifications."}
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {shown.map((n) => {
              const Icon = KIND_ICONS[n.kind] ?? AlertIcon
              return (
                <li key={n.id}>
                  <Link
                    to={n.to}
                    onClick={() => markNotificationRead(n.id)}
                    className="flex flex-wrap items-start gap-3.5 px-5 py-4 transition-colors hover:bg-secondary/60"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-2 size-2 shrink-0 rounded-full",
                        n.unread ? "bg-gold" : "bg-transparent"
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[14.5px] text-foreground",
                          n.unread ? "font-semibold" : "font-medium"
                        )}
                      >
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-[13.5px] text-muted-foreground">
                        {n.body}
                      </span>
                      <span className="mt-1.5 inline-block text-[13px] font-semibold text-primary">
                        Open
                      </span>
                    </span>
                    <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                      {n.time}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <SampleFooter>Sample records for presentation</SampleFooter>
    </div>
  )
}
