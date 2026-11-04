import * as React from "react"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Input with a leading search icon. */
function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-2" />
      <Input type="search" className="h-10 bg-card pl-9" {...props} />
    </div>
  )
}

export { SearchInput }
