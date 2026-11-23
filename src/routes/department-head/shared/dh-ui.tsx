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
      <p
        role="status"
        className="py-10 text-center text-sm text-muted-foreground"
      >
        Loading {label}…
      </p>
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
