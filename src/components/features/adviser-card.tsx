import * as React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Panel } from "@/components/features/panel"

/** "Your academic adviser" panel: avatar, name, faculty, contact, and an action slot. */
function AdviserCard({
  name,
  initials,
  faculty,
  email,
  assignedSince,
  action,
}: {
  name: string
  initials: string
  faculty: string
  email: string
  assignedSince: string
  action?: React.ReactNode
}) {
  return (
    <Panel title="Your academic adviser" description="Here to help you plan your next step." flush>
      <div className="flex items-center gap-4 px-5 py-5">
        <Avatar className="size-12">
          <AvatarFallback className="bg-primary font-heading font-bold text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <b className="block font-semibold">{name}</b>
          <span className="text-sm text-muted-foreground">{faculty}</span>
        </div>
      </div>
      <div className="grid gap-1 border-t border-border bg-secondary px-5 py-4 text-sm">
        <span>{email}</span>
        <span>Assigned since {assignedSince}</span>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </Panel>
  )
}

export { AdviserCard }
