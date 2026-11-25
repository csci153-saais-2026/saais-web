/**
 * Neutral placeholder shown while a public page's code downloads. Public pages
 * share no layout, so this avoids guessing one. Signed-in pages load inside the
 * app shell, which has its own skeleton fallback.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-background"
    >
      <span className="sr-only">Loading…</span>
      <div
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
      />
    </div>
  );
}
