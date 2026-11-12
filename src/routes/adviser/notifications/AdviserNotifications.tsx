import { Link } from "react-router"
import { AdviserPage } from "../Adviser"
import { notifications } from "@/mocks/adviser.mock"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { Button } from "@/components/ui/button"
import { FlagIcon, UploadIcon, AlertIcon, UserIcon } from "@/components/icons"

const icons = [FlagIcon, UploadIcon, AlertIcon, UserIcon]
export default function AdviserNotifications() {
  return <AdviserPage title="Notifications"><PageHeading title="Notifications" subtitle="2 unread of 4 notifications." actions={<Button variant="outline">Mark all as read</Button>} />
    <div className="mb-4 inline-flex gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Filter notifications"><Button size="sm" aria-pressed>All</Button><Button size="sm" variant="ghost" aria-pressed={false}>Unread (2)</Button></div>
    <Panel title="All notifications" flush><ul className="divide-y divide-line-soft">{notifications.map((n, index) => { const Icon = icons[index]; return <li key={n.id}><Link to={n.to} className="flex flex-wrap items-start gap-3 px-5 py-4 text-foreground hover:bg-secondary/60"><span className={`mt-2 size-2 shrink-0 rounded-full ${n.unread ? "bg-gold" : "bg-transparent"}`} /><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-status-neutral-bg text-status-neutral"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><strong className={`block text-sm ${n.unread ? "font-semibold" : "font-medium"}`}>{n.title}</strong>{n.unread && <span className="sr-only">Unread</span>}<span className="mt-1 block text-sm text-muted-foreground">{n.body}</span><span className="mt-1 block text-sm font-semibold text-primary">Open</span></span><span className="text-xs text-muted-foreground">{n.time}</span></Link></li> })}</ul></Panel>
  </AdviserPage>
}
