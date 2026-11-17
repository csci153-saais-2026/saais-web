import { Panel } from "@/components/features/panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function DeanQueryState({
  isLoading,
  isError,
  label,
  onRetry,
}: {
  isLoading: boolean
  isError: boolean
  label: string
  onRetry?: () => void
}) {
  if (isLoading) {
    return (
      <Panel title={`Loading ${label}…`} description="Fetching records from the server.">
        <p role="status" className="py-4 text-sm text-muted-foreground">
          Loading {label}…
        </p>
      </Panel>
    )
  }

  if (isError) {
    return (
      <Alert role="alert" variant="destructive">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Unable to load {label}. Please try again.</span>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

