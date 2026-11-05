import * as React from "react"
import { AppSidebar } from "@/components/features/sidebar"
import { Topbar, type Crumb } from "@/components/features/topbar"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"

type SidebarProps = React.ComponentProps<typeof AppSidebar>

function ShellBody({
  crumbs,
  topbarTrailing,
  children,
}: {
  crumbs: Crumb[]
  topbarTrailing?: React.ReactNode
  children: React.ReactNode
}) {
  const { toggleSidebar } = useSidebar()
  return (
    <SidebarInset className="min-w-0">
      <Topbar crumbs={crumbs} trailing={topbarTrailing} onMenuClick={toggleSidebar} />
      <div className="w-full px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)">
        {children}
      </div>
    </SidebarInset>
  )
}

/**
 * Authenticated page frame: shadcn Sidebar (fixed 250px, Sheet drawer below 768px), topbar, and a
 * 32px-gutter content area. Used by every role portal.
 */
function AppShell({
  sidebar,
  crumbs,
  topbarTrailing,
  children,
}: {
  sidebar: SidebarProps
  crumbs: Crumb[]
  topbarTrailing?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar {...sidebar} />
      <ShellBody crumbs={crumbs} topbarTrailing={topbarTrailing}>
        {children}
      </ShellBody>
    </SidebarProvider>
  )
}

export { AppShell }
