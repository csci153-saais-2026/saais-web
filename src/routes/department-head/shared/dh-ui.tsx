import { TableSkeleton } from "@/components/features/loading-skeletons";
/** Loading and failure message for a page whose data comes from the API. */
export function QueryMessage({
  query,
  label,
}: {
  query: { isError: boolean; error: unknown; refetch: () => unknown };
  label: string;
}) {
  if (!query.isError)
    return (
      <TableSkeleton
        rows={5}
        columns={4}
        label={`Loading ${label}…`}
        className="py-6"
      />
    );
  const message =
    query.error instanceof Error
      ? query.error.message
      : `${label} could not be loaded.`;
  return (
    <div role="alert" className="rounded-md border border-border bg-card p-5">
      <p className="font-semibold">We couldn’t load {label}.</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        className="mt-3 text-sm font-medium underline underline-offset-4"
        onClick={() => void query.refetch()}
      >
        Try again
      </button>
    </div>
  );
}
