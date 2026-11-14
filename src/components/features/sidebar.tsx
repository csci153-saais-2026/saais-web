import { BookIcon, ChevronDownIcon, LogoutIcon, type IconComponent } from "@/components/icons"
import * as React from "react"
import { Link, NavLink } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BrandMark } from "@/components/ui/brand-mark"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type NavItem = {
  label: string
  href: string
  icon?: IconComponent
  badge?: number | string
  children?: NavItem[]
  end?: boolean
}

export type NavSection = {
  title?: string
  items: NavItem[]
}

export type SidebarUser = { name: string; subtitle: string; initials: string }

function matchesNavPath(pathname: string, item: NavItem): boolean {
  return pathname === item.href || (!item.end && pathname.startsWith(`${item.href}/`))
}

function hasActiveDescendant(pathname: string, item: NavItem): boolean {
  return item.children?.some(child => matchesNavPath(pathname, child) || hasActiveDescendant(pathname, child)) ?? false
}

function NavItems({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu className="gap-0.5">
      {items.map(item => <NavEntry key={item.href} item={item} currentPath={currentPath} onNavigate={() => setOpenMobile(false)} />)}
    </SidebarMenu>
  )
}

function NavEntry({ item, currentPath, onNavigate }: {
  item: NavItem
  currentPath: string
  onNavigate: () => void
}) {
  const { label, href, icon: Icon, end, badge, children } = item
  const active = matchesNavPath(currentPath, item)
  const activeBranch = active || hasActiveDescendant(currentPath, item)
  const [submenu, setSubmenu] = React.useState({ path: currentPath, open: activeBranch })
  // Record every route transition, including an intermediate route away from
  // an intentionally collapsed active branch. This guarded render update keeps
  // the active child visible when navigation returns to that branch.
  if (submenu.path !== currentPath) {
    setSubmenu({ path: currentPath, open: activeBranch || submenu.open })
  }
  const link = (
    <div className="relative">
      <SidebarMenuButton asChild>
        <NavLink to={href} end={end} onClick={onNavigate} className={badge !== undefined ? "pr-12" : undefined}>
          {Icon && <Icon aria-hidden />}
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
      {badge !== undefined && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
    </div>
  )
  return (
    <SidebarMenuItem>
      {children?.length ? (
        <Collapsible open={submenu.path === currentPath ? submenu.open : activeBranch || submenu.open} onOpenChange={open => setSubmenu({ path: currentPath, open })}>
          <div className="flex items-center">
            <div className="min-w-0 flex-1">{link}</div>
            <CollapsibleTrigger className="rounded p-2 hover:bg-sidebar-accent focus-visible:outline-gold" aria-label={`Toggle ${label} submenu`}>
              <ChevronDownIcon className="size-4" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="ml-4 border-l border-sidebar-border pl-2">
            <NavItems items={children} currentPath={currentPath} />
          </CollapsibleContent>
        </Collapsible>
      ) : link}
    </SidebarMenuItem>
  )
}

function NavGroup({ section, currentPath }: { section: NavSection; currentPath: string }) {
  const active = section.items.some(item => matchesNavPath(currentPath, item) || hasActiveDescendant(currentPath, item))
  const [group, setGroup] = React.useState({ path: currentPath, open: true })
  if (group.path !== currentPath) {
    setGroup({ path: currentPath, open: active || group.open })
  }
  return (
    <Collapsible open={group.path === currentPath ? group.open : active || group.open} onOpenChange={open => setGroup({ path: currentPath, open })} className="group/collapsible">
      <SidebarGroup>
        {section.title && <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="w-full justify-between">
            {section.title}
            <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" aria-hidden />
          </CollapsibleTrigger>
        </SidebarGroupLabel>}
        <CollapsibleContent>
          <SidebarGroupContent>
            <NavItems items={section.items} currentPath={currentPath} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

/** Account trigger at the sidebar foot; opens a menu with profile + sign out. */
function AccountMenu({
  user,
  profileHref,
  onSignOut,
}: {
  user: SidebarUser
  profileHref?: string
  onSignOut: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-gold">
        <Avatar size="lg">
          <AvatarFallback className="bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[13.5px] font-semibold">{user.name}</b>
          <small className="block truncate text-[11.5px] text-sidebar-foreground/55">{user.subtitle}</small>
        </span>
        <ChevronDownIcon className="size-4 text-sidebar-foreground/55" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-56 gap-0 p-1.5">
        {profileHref && (
          <Link to={profileHref} className="flex items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-sm font-medium hover:bg-accent">
            My profile
          </Link>
        )}
        <hr className="my-1 border-line-soft" />
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-accent"
        >
          <LogoutIcon className="size-4" /> Sign out
        </button>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Role-portal sidebar built on the shadcn Sidebar: fixed 250px on desktop, Sheet drawer on mobile.
 * Must be rendered inside <SidebarProvider> (AppShell does this).
 */
function AppSidebar({
  portalLabel = "SAAIS workspace",
  sections,
  currentPath,
  user,
  helpHref = "/docs",
  profileHref,
  onSignOut,
}: {
  portalLabel?: string
  sections: NavSection[]
  currentPath: string
  user?: SidebarUser
  helpHref?: string
  profileHref?: string
  onSignOut?: () => void
}) {
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border">
      <SidebarHeader className="px-5 pt-5.5 pb-4">
        <Link to="/" onClick={() => setOpenMobile(false)} className="border-b border-sidebar-border pb-4 text-sidebar-foreground hover:text-sidebar-foreground">
          <BrandMark caption={portalLabel} />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3">
        {sections.map((section, index) => (
          <NavGroup key={section.title ?? index} section={section} currentPath={currentPath} />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-sidebar-border px-3 pt-3 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to={helpHref} onClick={() => setOpenMobile(false)}>
                <BookIcon aria-hidden />
                <span>Help &amp; documentation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {user && onSignOut && <AccountMenu user={user} profileHref={profileHref} onSignOut={onSignOut} />}
      </SidebarFooter>
    </Sidebar>
  )
}

export { AppSidebar }
