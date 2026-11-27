import { SkeletonBox } from "skullet/react";
import { PageSkeleton } from "@/components/features/loading-skeletons";
import { BrandMark } from "@/components/ui/brand-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

/** Row widths for the nav placeholder; the real item labels vary per role. */
const NAV_GROUPS: readonly (readonly string[])[] = [
  ["62%", "48%", "70%", "55%"],
  ["58%", "66%", "44%", "60%", "52%"],
];

function NavRow({ width }: { width: string }) {
  return (
    <SidebarMenuItem>
      <div className="flex h-8 items-center gap-2 px-2">
        <SkeletonBox width={16} height={16} />
        <SkeletonBox width={width} height={14} />
      </div>
    </SidebarMenuItem>
  );
}

/**
 * Loading frame for the authenticated shell. It is built from the real
 * Sidebar, topbar and content-area primitives, so the 250px sidebar, the
 * topbar height and the gutters sit exactly where the loaded shell puts them
 * and nothing jumps when the workspace arrives. The role-specific nav labels
 * are not known yet, so they are bars.
 */
export function ShellSkeleton({ label = "Loading workspace…" }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        <SidebarProvider>
          <Sidebar collapsible="offcanvas" className="border-sidebar-border">
            <SidebarHeader className="px-5 pt-5.5 pb-4">
              <div className="border-b border-sidebar-border pb-4 text-sidebar-foreground">
                <BrandMark />
              </div>
            </SidebarHeader>
            <SidebarContent className="px-3">
              {NAV_GROUPS.map((widths, g) => (
                <SidebarGroup key={g}>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {widths.map((w, i) => (
                        <NavRow key={i} width={w} />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
            <SidebarFooter className="gap-1 border-t border-sidebar-border px-3 pt-3 pb-4">
              <SidebarMenu>
                <NavRow width="68%" />
              </SidebarMenu>
              <div className="flex items-center gap-3 px-2.5 py-2.5">
                <SkeletonBox width={36} height={36} radius="50%" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <SkeletonBox width="70%" height={13} />
                  <SkeletonBox width="90%" height={11} />
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset className="min-w-0">
            <header className="flex h-auto min-h-topbar shrink-0 flex-wrap items-center gap-y-1 border-b border-border bg-card px-gutter-sm md:px-gutter">
              <div className="flex-1 py-3">
                <SkeletonBox width={220} height={14} />
              </div>
              <SkeletonBox width={36} height={36} radius="50%" />
            </header>
            <div className="w-full px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)">
              <PageSkeleton bare className="p-0" />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
