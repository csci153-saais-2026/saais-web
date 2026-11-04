import * as React from "react";
import { Sidebar } from "@/components/features/sidebar";
import { Topbar, type Crumb } from "@/components/features/topbar";
import { cn } from "@/lib/utils";

type SidebarProps = Omit<
  React.ComponentProps<typeof Sidebar>,
  "className" | "onNavigate"
>;

/**
 * Authenticated page frame: sticky 250px sidebar (drawer below 768px), topbar, and a
 * 32px-gutter content area. Used by every role portal.
 */
function AppShell({
  sidebar,
  crumbs,
  topbarTrailing,
  children,
}: {
  sidebar: SidebarProps;
  crumbs: Crumb[];
  topbarTrailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        {...sidebar}
        onNavigate={() => setOpen(false)}
        className={cn(
          "sticky top-0 self-start max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl",
          !open && "max-md:hidden",
        )}
      />
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-forest-deep/35 md:hidden"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          crumbs={crumbs}
          trailing={topbarTrailing}
          onMenuClick={() => setOpen(true)}
        />
        <main className="w-full px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)">
          {children}
        </main>
      </div>
    </div>
  );
}

export { AppShell };
