import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
type AuditAction = "View" | "Change" | "Sign-in";

const PILL_STYLES: Readonly<Record<AuditAction, string>> = {
  Change: "border-transparent bg-[#FBF0D6] text-[#8A6206]",
  "Sign-in": "border-transparent bg-[#E7F0E2] text-[#2C6430]",
  View: "border-transparent bg-[#E4EDF4] text-[#2A4C6B]",
};

export function AuditActionPill({ action }: { action: AuditAction }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-[4px] px-2 py-0.5 text-xs font-semibold",
        PILL_STYLES[action],
      )}
    >
      {action}
    </Badge>
  );
}
