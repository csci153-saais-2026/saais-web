import { Alert, AlertDescription } from "@/components/ui/alert"

export function DeanReadOnlyNotice() {
  return (
    <Alert
      role="status"
      className="border-border bg-secondary/70 text-foreground"
    >
      <AlertDescription>
        <strong>Read-only Dean view.</strong> Opening this record is recorded in the audit log.
      </AlertDescription>
    </Alert>
  )
}

