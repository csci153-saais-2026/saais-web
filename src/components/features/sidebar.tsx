import { BookOpenIcon, ChevronDownIcon, LogOutIcon, type LucideIcon } from "lucide-react"
import { Link, NavLink } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BrandMark } from "@/components/ui/brand-mark"
import { Kicker } from "@/components/ui/kicker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type NavItem = { label: string; to: string; icon: LucideIcon }
export type NavSection = { label: string; items: NavItem[] }

export type SidebarUser = { name: string; subtitle: string; initials: string }

function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto">
      {sections.map((section) => (
        <div key={section.label}>
          <Kicker className="block px-4 pt-3.5 pb-2.5 text-sidebar-foreground/60">{section.label}</Kicker>
          <ul className="grid gap-0.5">
            {section.items.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[5px] border-l-[3px] border-transparent px-3.5 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-gold",
                      isActive && "border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    )
                  }
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
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
          <Link
            to={profileHref}
            className="flex items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-sm font-medium hover:bg-accent"
          >
            My profile
          </Link>
        )}
        <hr className="my-1 border-line-soft" />
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-accent"
        >
          <LogOutIcon className="size-4" /> Sign out
        </button>
      </PopoverContent>
    </Popover>
  )
}

/** The fixed 250px forest sidebar: brand, nav sections, help link, account menu. */
function Sidebar({
  portalLabel,
  sections,
  user,
  helpHref = "/docs",
  profileHref,
  onSignOut,
  onNavigate,
  className,
}: {
  portalLabel: string
  sections: NavSection[]
  user: SidebarUser
  helpHref?: string
  profileHref?: string
  onSignOut: () => void
  onNavigate?: () => void
  className?: string
}) {
  return (
    <aside
      className={cn(
        "flex h-dvh w-sidebar shrink-0 flex-col gap-3 bg-sidebar px-3 pt-5.5 pb-4 text-sidebar-foreground",
        className
      )}
    >
      <Link to="/" className="mb-1 border-b border-sidebar-border px-2 pb-4">
        <BrandMark caption={portalLabel} />
      </Link>
      <SidebarNav sections={sections} onNavigate={onNavigate} />
      <div className="border-t border-sidebar-border pt-3">
        <Link
          to={helpHref}
          className="mb-1 flex items-center gap-3 rounded-[5px] px-3.5 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <BookOpenIcon className="size-[18px]" aria-hidden /> Help &amp; documentation
        </Link>
        <AccountMenu user={user} profileHref={profileHref} onSignOut={onSignOut} />
      </div>
    </aside>
  )
}

export { Sidebar, SidebarNav, AccountMenu }
