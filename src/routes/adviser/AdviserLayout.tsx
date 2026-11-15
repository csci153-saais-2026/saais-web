import { Suspense } from "react"
import { Outlet } from "react-router"

/** Adviser content inside the host shell; keep its viewport and gutter ownership intact. */
export function AdviserLayout() {
  return (
    <div className="min-w-0 w-full [overflow-wrap:anywhere]">
      <Suspense fallback={<p role="status" className="text-muted-foreground">Loading adviser page…</p>}>
        <Outlet />
      </Suspense>
    </div>
  )
}
