import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DeanAuditAction } from "@/routes/dean/types"

export function DeanAuditActionPill({ action }: { action: DeanAuditAction }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        action === "View"
          ? "border-border bg-secondary/70 text-foreground"
          : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      {action}
    </Badge>
  )
}
