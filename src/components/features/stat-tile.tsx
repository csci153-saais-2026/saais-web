import * as React from "react"
import { Card } from "@/components/ui/card"
import { Kicker } from "@/components/ui/kicker"
import { cn } from "@/lib/utils"

type StatTileProps = {
  label: string
  value: React.ReactNode
  /** Muted trailing text next to the value, e.g. "/ 147". */
  valueSuffix?: string
  note?: React.ReactNode
}

/** Summary metric: kicker label, large Syne value, small note. */
function StatTile({ label, value, valueSuffix, note }: StatTileProps) {
  return (
    <Card className="gap-2 rounded-md px-5 py-5 shadow-none ring-0 border border-border">
      <Kicker>{label}</Kicker>
      <div className="font-heading text-4xl leading-none font-bold text-primary">
        {value}
        {valueSuffix && <span className="ml-1.5 text-lg font-semibold text-muted-2">{valueSuffix}</span>}
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </Card>
  )
}

/** Responsive row of StatTiles (4-up on desktop, single column on mobile). */
function StatGrid({ items, className }: { items: StatTileProps[]; className?: string }) {
  return (
    <div className={cn("mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <StatTile key={item.label} {...item} />
      ))}
    </div>
  )
}

export { StatTile, StatGrid }
