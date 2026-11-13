import { cn } from "@/lib/utils"

/**
 * Floating UI-preview toast styled in `--forest-deep` (`#1d2f0a`) with cream
 * foreground (`--background`) to match `.toast` in `department-head.css`.
 */
export function DepartmentToast({
  message,
  className,
}: {
  message: string | null
  className?: string
}) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed right-6 bottom-6 z-50 max-w-sm rounded-lg bg-forest-deep px-4 py-2.5 text-[13.5px] font-medium text-background shadow-lg",
        className
      )}
    >
      {message}
    </div>
  )
}
