import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Bordered section with a titled header, optional action, and a hairline under the header. */
function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  /** Remove body padding (for tables that run edge to edge). */
  flush?: boolean
}) {
  return (
    <Card className={cn("mb-4 gap-0 rounded-md border border-border py-0 shadow-none ring-0", className)}>
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="font-sans text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn(flush ? "p-0" : "p-5", bodyClassName)}>{children}</CardContent>
    </Card>
  )
}

export { Panel }
