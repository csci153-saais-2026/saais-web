import { BookIcon, ChevronDownIcon, LogoutIcon, type IconComponent } from "@/components/icons"
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
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type NavItem = {
  label: string
  to: string
  icon: IconComponent
  /** Match the path exactly (e.g. dashboards), instead of also matching child routes. */
  end?: boolean
}

export type NavSection = {
  label: string
  items: NavItem[]
  /** Render the section label as an expandable header (e.g. ADVISER / DEPARTMENT HEAD groups). */
  collapsible?: boolean
  defaultOpen?: boolean
}

export type SidebarUser = { name: string; subtitle: string; initials: string }

function NavItems({ items }: { items: NavItem[] }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu className="gap-0.5">
      {items.map(({ label, to, icon: Icon, end }) => (
        <SidebarMenuItem key={to}>
          {/* NavLink sets aria-current="page" on the active route, which the menu button styles. */}
          <SidebarMenuButton asChild>
            <NavLink to={to} end={end} onClick={() => setOpenMobile(false)}>
              <Icon aria-hidden />
              <span>{label}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function NavGroup({ section }: { section: NavSection }) {
  if (!section.collapsible) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <NavItems items={section.items} />
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }
  return (
    <Collapsible defaultOpen={section.defaultOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="w-full justify-between">
            {section.label}
            <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" aria-hidden />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <NavItems items={section.items} />
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
  portalLabel,
  sections,
  user,
  helpHref = "/docs",
  profileHref,
  onSignOut,
}: {
  portalLabel: string
  sections: NavSection[]
  user: SidebarUser
  helpHref?: string
  profileHref?: string
  onSignOut: () => void
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
        {sections.map((section) => (
          <NavGroup key={section.label} section={section} />
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
        <AccountMenu user={user} profileHref={profileHref} onSignOut={onSignOut} />
      </SidebarFooter>
    </Sidebar>
  )
}

export { AppSidebar }
