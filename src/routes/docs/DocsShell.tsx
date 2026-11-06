import * as React from 'react'
import { Link, NavLink } from 'react-router'
import { Topbar, type Crumb } from '@/components/features/topbar'
import {
  BookIcon,
  GridIcon,
  ListIcon,
  NoteIcon,
} from '@/components/icons'
import { BrandMark } from '@/components/ui/brand-mark'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar'
import type { MarkdownSectionHeading } from '@/routes/docs/markdown-blocks'

export interface DocsShellProps {
  readonly crumbs: Crumb[]
  readonly topbarTrailing?: React.ReactNode
  readonly guideSections?: readonly MarkdownSectionHeading[]
  /** Remove standard page gutter/padding when rendering full-bleed Redoc canvas. */
  readonly flush?: boolean
  readonly children: React.ReactNode
}

const REFERENCE_NAV = [
  { label: 'Documentation hub', to: '/docs', icon: BookIcon, end: true },
  { label: 'OpenAPI 3.1 contract', to: '/docs/openapi', icon: NoteIcon, end: true },
  { label: 'Style guide', to: '/styleguide', icon: GridIcon, end: true },
] as const

function DocsSidebarContent({
  guideSections,
}: {
  readonly guideSections?: readonly MarkdownSectionHeading[]
}) {
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border">
      <SidebarHeader className="px-5 pt-5.5 pb-4">
        <Link
          to="/docs"
          onClick={() => setOpenMobile(false)}
          className="border-b border-sidebar-border pb-4 text-sidebar-foreground hover:text-sidebar-foreground"
        >
          <BrandMark caption="Documentation" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel>Reference surfaces</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {REFERENCE_NAV.map(({ label, to, icon: Icon, end }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild>
                    <NavLink to={to} end={end} onClick={() => setOpenMobile(false)}>
                      <Icon aria-hidden />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {guideSections && guideSections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>On this page</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {guideSections
                  .filter((section) => section.level === 2)
                  .map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton asChild>
                        <a
                          href={`#${section.id}`}
                          onClick={() => setOpenMobile(false)}
                        >
                          <ListIcon aria-hidden />
                          <span>{section.heading}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 pt-3 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/" onClick={() => setOpenMobile(false)}>
                <span>Back to SAAIS home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function DocsShellBody({
  crumbs,
  topbarTrailing,
  flush,
  children,
}: Omit<DocsShellProps, 'guideSections'>) {
  const { toggleSidebar } = useSidebar()

  return (
    <SidebarInset className="min-w-0">
      <Topbar
        crumbs={crumbs}
        trailing={topbarTrailing}
        onMenuClick={toggleSidebar}
      />
      <div
        className={
          flush
            ? 'w-full flex-1'
            : 'w-full max-w-[1120px] px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)'
        }
      >
        {children}
      </div>
    </SidebarInset>
  )
}

/**
 * Shared SAAIS documentation frame: 250px themed forest Sidebar (Sheet drawer below 768px),
 * 62px Topbar with Breadcrumb trail, and tokenized content padding.
 */
export function DocsShell({
  crumbs,
  topbarTrailing,
  guideSections,
  flush = false,
  children,
}: DocsShellProps) {
  return (
    <SidebarProvider>
      <DocsSidebarContent guideSections={guideSections} />
      <DocsShellBody
        crumbs={crumbs}
        topbarTrailing={topbarTrailing}
        flush={flush}
      >
        {children}
      </DocsShellBody>
    </SidebarProvider>
  )
}
