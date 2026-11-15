import { useState } from "react"
import { BellIcon } from "@/components/icons"
import { Link } from "react-router"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type NotificationItem = { id: string; title: string; time: string; unread?: boolean; to?: string }

/** Topbar bell with unread badge and a popover list. */
function NotificationBell({
  items,
  allHref,
  onMarkAllRead,
  loading = false,
  error,
  showUnreadCount = true,
}: {
  items: NotificationItem[]
  allHref?: string
  onMarkAllRead?: () => void | Promise<unknown>
  loading?: boolean
  error?: string | null
  showUnreadCount?: boolean
}) {
  const unread = items.filter((i) => i.unread).length
  const [actionError, setActionError] = useState<string | null>(null)
  const handleMarkAllRead = async () => {
    if (!onMarkAllRead) return
    setActionError(null)
    try { await onMarkAllRead() } catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to update notifications.') }
  }
  return (
    <Popover>
      <PopoverTrigger
        aria-label={showUnreadCount && unread ? `Notifications, ${unread} unread` : unread ? 'Notifications, unread items' : "Notifications"}
        className="relative inline-flex size-11 items-center justify-center rounded-lg border border-transparent text-muted-2 hover:border-border hover:bg-background hover:text-primary data-[state=open]:border-border data-[state=open]:bg-background data-[state=open]:text-primary"
      >
        <BellIcon className="size-[19px]" />
        {showUnreadCount && unread > 0 && (
          <span className="absolute top-1 right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10.5px] leading-4 font-semibold text-white">
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] gap-0 p-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
          <h2 className="font-sans text-base font-semibold">Notifications</h2>
          {onMarkAllRead && (
            <button type="button" onClick={() => void handleMarkAllRead()} disabled={loading} className="text-[12.5px] font-semibold text-primary hover:underline disabled:opacity-50">
              Mark all as read
            </button>
          )}
        </div>
        {loading ? (
          <p role="status" className="border-t border-line-soft px-4 py-4 text-sm text-muted-foreground">Loading notifications…</p>
        ) : error ? (
          <p role="alert" className="border-t border-line-soft px-4 py-4 text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <p className="border-t border-line-soft px-4 py-4 text-sm text-muted-foreground">You are all caught up.</p>
        ) : (
          <ul className="border-t border-line-soft">
            {items.map((n) => (
              <li key={n.id} className="border-b border-line-soft last:border-b-0">
                  {n.to || allHref ? <Link to={n.to ?? allHref!} className="flex items-start gap-2.5 px-4 py-3 hover:bg-secondary/60">{notificationContent(n)}</Link> : <div className="flex items-start gap-2.5 px-4 py-3">{notificationContent(n)}</div>}
              </li>
            ))}
          </ul>
        )}
        {actionError && <p role="alert" className="border-t border-line-soft px-4 py-3 text-sm text-destructive">{actionError}</p>}
        {allHref && <Link to={allHref} className="block border-t border-line-soft px-4 py-3 text-center text-[13.5px] font-semibold text-primary hover:bg-secondary/60">See all notifications</Link>}
      </PopoverContent>
    </Popover>
  )
}

function notificationContent(item: NotificationItem) {
  return <><span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.unread ? "bg-gold" : "bg-transparent")} /><span><strong className={cn("block text-[13.5px]", item.unread ? "font-semibold" : "font-medium")}>{item.title}</strong><small className="text-xs text-muted-2">{item.time}</small></span></>
}

export { NotificationBell }
