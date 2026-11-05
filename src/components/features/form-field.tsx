import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Label + control + optional hint/error, wired together with ids. */
function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormField }
