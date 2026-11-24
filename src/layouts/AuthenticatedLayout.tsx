import { Suspense, type ComponentProps } from "react";
import { PageSkeleton } from "@/components/features/loading-skeletons";
import { Outlet, useLocation } from "react-router";
import { AppShell } from "@/components/features/app-shell";
import type { AppSidebar } from "@/components/features/sidebar";
import type { Crumb } from "@/components/features/topbar";
import { getNavigationSections } from "@/navigation/get-navigation-sections";
import type { NavigationRole } from "@/navigation/navigation-config";

type SidebarOptions = Omit<
  ComponentProps<typeof AppSidebar>,
  "sections" | "currentPath"
>;

/** Shared shell receiving authorized role assignments from the auth connector. */
export function AuthenticatedLayout({
  assignments,
  sidebar,
  crumbs,
  topbarTrailing,
}: {
  assignments: readonly { role: NavigationRole }[];
  sidebar?: SidebarOptions;
  crumbs: Crumb[];
  topbarTrailing?: ComponentProps<typeof AppShell>["topbarTrailing"];
}) {
  const { pathname } = useLocation();

  return (
    <AppShell
      sidebar={{
        ...sidebar,
        sections: getNavigationSections(assignments),
        currentPath: pathname,
      }}
      crumbs={crumbs}
      topbarTrailing={topbarTrailing}
    >
      {/* Keep the shell on screen while a lazy portal chunk loads. */}
      <Suspense fallback={<PageSkeleton label="Loading…" className="p-0" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
