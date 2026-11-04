import * as React from "react"
import { cn } from "@/lib/utils"

/** Small uppercase label: IBM Plex Sans 600, 11.5px, 0.14em tracking. */
function Kicker({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="kicker"
      className={cn("text-[11.5px] font-semibold tracking-[0.14em] text-muted-2 uppercase", className)}
      {...props}
    />
  )
}

export { Kicker }
