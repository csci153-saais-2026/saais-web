import { PageSkeleton } from "@/components/features/loading-skeletons";
import { Suspense } from "react";
import { Outlet } from "react-router";

/** Adviser content inside the host shell; keep its viewport and gutter ownership intact. */
export function AdviserLayout() {
  return (
    <div className="min-w-0 w-full wrap-anywhere">
      <Suspense fallback={<PageSkeleton label="Loading adviser page…" />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
