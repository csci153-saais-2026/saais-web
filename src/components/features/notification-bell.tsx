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
}: {
  items: NotificationItem[]
  allHref: string
  onMarkAllRead?: () => void
}) {
  const unread = items.filter((i) => i.unread).length
  return (
    <Popover>
      <PopoverTrigger
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative inline-flex size-11 items-center justify-center rounded-lg border border-transparent text-muted-2 hover:border-border hover:bg-background hover:text-primary data-[state=open]:border-border data-[state=open]:bg-background data-[state=open]:text-primary"
      >
        <BellIcon className="size-[19px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10.5px] leading-4 font-semibold text-white">
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] gap-0 p-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
          <h2 className="font-sans text-base font-semibold">Notifications</h2>
          {onMarkAllRead && (
            <button type="button" onClick={onMarkAllRead} className="text-[12.5px] font-semibold text-primary hover:underline">
              Mark all as read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="border-t border-line-soft px-4 py-4 text-sm text-muted-foreground">You are all caught up.</p>
        ) : (
          <ul className="border-t border-line-soft">
            {items.map((n) => (
              <li key={n.id} className="border-b border-line-soft last:border-b-0">
                <Link to={n.to ?? allHref} className="flex items-start gap-2.5 px-4 py-3 hover:bg-secondary/60">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.unread ? "bg-gold" : "bg-transparent")} />
                  <span>
                    <strong className={cn("block text-[13.5px]", n.unread ? "font-semibold" : "font-medium")}>{n.title}</strong>
                    <small className="text-xs text-muted-2">{n.time}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to={allHref} className="block border-t border-line-soft px-4 py-3 text-center text-[13.5px] font-semibold text-primary hover:bg-secondary/60">
          See all notifications
        </Link>
      </PopoverContent>
    </Popover>
  )
}

export { NotificationBell }
