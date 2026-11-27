import { TableSkeleton } from "@/components/features/loading-skeletons";
import { Panel } from "@/components/features/panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DeanQueryState({
  isLoading,
  isError,
  isEmpty = false,
  label,
  emptyTitle,
  emptyMessage,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  label: string;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return (
      <Panel
        title={`Loading ${label}…`}
        description="Fetching records from the server."
      >
        <TableSkeleton rows={4} columns={4} label={`Loading ${label}…`} />
      </Panel>
    );
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
    );
  }

  if (isEmpty) {
    return (
      <Panel title={emptyTitle ?? `No ${label} available`}>
        <div className="flex flex-col items-start gap-3 py-2 text-sm text-muted-foreground">
          <p>{emptyMessage ?? `No ${label} are currently available.`}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  return null;
}
