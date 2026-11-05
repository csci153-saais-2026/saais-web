import { useLocation, Outlet } from "react-router"
import { AppShell } from "@/components/features/app-shell"
import { NotificationBell, type NotificationItem } from "@/components/features/notification-bell"
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  FlagIcon,
  GridIcon,
  NoteIcon,
  PencilIcon,
  ShieldIcon,
  SwapIcon,
  UploadIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons"
import type { NavSection, SidebarUser } from "@/components/features/sidebar"

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "New transfer request submitted for Luis Miguel Cruz",
    time: "10m ago",
    unread: true,
    to: "/department-head/curriculum-transfers",
  },
  {
    id: "notif-2",
    title: "Grade encoding deadline approaching for AY 2025–2026 1st sem",
    time: "2h ago",
    unread: true,
    to: "/department-head/academic-terms",
  },
  {
    id: "notif-3",
    title: "Outside credits evaluated for Ana Marie Santos",
    time: "Yesterday",
    unread: false,
    to: "/department-head/outside-credits",
  },
]

const USER_HEAD: SidebarUser = {
  name: "Dr. Andrea Dela Cruz",
  subtitle: "Department Head · DCST",
  initials: "AC",
}

const SECTIONS: NavSection[] = [
  {
    label: "Adviser",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Dashboard", to: "/department-head/adviser/dashboard", icon: GridIcon, end: true },
      { label: "Advisees", to: "/department-head/adviser/advisees", icon: UsersIcon },
      { label: "Encode grades", to: "/department-head/adviser/encode-grades", icon: PencilIcon },
      { label: "Import grades", to: "/department-head/adviser/import-grades", icon: UploadIcon },
      { label: "Grade flags", to: "/department-head/adviser/grade-flags", icon: FlagIcon },
    ],
  },
  {
    label: "Department Head",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Curriculum transfers", to: "/department-head/curriculum-transfers", icon: SwapIcon },
      { label: "Curricula", to: "/department-head/curricula", icon: BookIcon },
      { label: "Equivalence", to: "/department-head/equivalence", icon: SwapIcon },
      { label: "Outside credits", to: "/department-head/outside-credits", icon: CheckIcon },
      { label: "Students", to: "/department-head/students", icon: UsersIcon },
      { label: "Adviser assignments", to: "/department-head/adviser-assignments", icon: UserIcon },
      { label: "Academic terms", to: "/department-head/academic-terms", icon: CalendarIcon },
      { label: "Department reports", to: "/department-head/department-reports", icon: ChartIcon },
      { label: "Audit log", to: "/department-head/audit-log", icon: NoteIcon },
      { label: "Settings", to: "/department-head/settings", icon: ShieldIcon },
    ],
  },
]

const PATH_TITLES: Record<string, string> = {
  "/department-head": "Curriculum transfers",
  "/department-head/curriculum-transfers": "Curriculum transfers",
  "/department-head/curricula": "Curricula",
  "/department-head/equivalence": "Equivalence",
  "/department-head/outside-credits": "Outside credits",
  "/department-head/students": "Students",
  "/department-head/adviser-assignments": "Adviser assignments",
  "/department-head/academic-terms": "Academic terms",
  "/department-head/department-reports": "Department reports",
  "/department-head/audit-log": "Audit log",
  "/department-head/settings": "Settings",
  "/department-head/adviser/dashboard": "Dashboard",
  "/department-head/adviser/advisees": "Advisees",
  "/department-head/adviser/encode-grades": "Encode grades",
  "/department-head/adviser/import-grades": "Import grades",
  "/department-head/adviser/grade-flags": "Grade flags",
}

export function DepartmentHeadLayout() {
  const location = useLocation()
  const currentTitle = PATH_TITLES[location.pathname] ?? "Workspace"

  const crumbs = [
    { label: "Department workspace", to: "/department-head/curriculum-transfers" },
    { label: currentTitle },
  ]

  return (
    <AppShell
      sidebar={{
        portalLabel: "Department Head portal",
        sections: SECTIONS,
        user: USER_HEAD,
        profileHref: "/department-head/settings",
        onSignOut: () => {
          window.location.href = "/"
        },
      }}
      crumbs={crumbs}
      topbarTrailing={
        <NotificationBell
          items={MOCK_NOTIFICATIONS}
          allHref="/department-head/notifications"
          onMarkAllRead={() => {}}
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}
