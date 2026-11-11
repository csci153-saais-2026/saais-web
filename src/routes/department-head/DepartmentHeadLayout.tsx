import { useCallback, useState } from "react"
import { Outlet, useLocation } from "react-router"
import { AppShell } from "@/components/features/app-shell"
import { NotificationBell } from "@/components/features/notification-bell"
import {
  BookIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  FlagIcon,
  GridIcon,
  ListIcon,
  NoteIcon,
  PencilIcon,
  ShieldIcon,
  SwapIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/icons"
import type { NavSection, SidebarUser } from "@/components/features/sidebar"
import type { DepartmentNotificationsContext } from "./dh-utils"
import {
  MOCK_DEPARTMENT_NOTIFICATIONS,
  type DepartmentNotificationRecord,
} from "./mock-data"

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
      { label: "Equivalence", to: "/department-head/equivalence", icon: ListIcon },
      { label: "Outside credits", to: "/department-head/outside-credits", icon: CheckIcon },
      { label: "Students", to: "/department-head/students", icon: UsersIcon },
      { label: "Adviser assignments", to: "/department-head/adviser-assignments", icon: SwapIcon },
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
  "/department-head/notifications": "Notifications",
  "/department-head/adviser/dashboard": "Dashboard",
  "/department-head/adviser/advisees": "Advisees",
  "/department-head/adviser/encode-grades": "Encode grades",
  "/department-head/adviser/import-grades": "Import grades",
  "/department-head/adviser/grade-flags": "Grade flags",
}

export function DepartmentHeadLayout() {
  const location = useLocation()
  const currentTitle = PATH_TITLES[location.pathname] ?? "Workspace"
  const [notifications, setNotifications] = useState<DepartmentNotificationRecord[]>(
    MOCK_DEPARTMENT_NOTIFICATIONS
  )

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    )
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }, [])

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
        helpHref: "/styleguide",
        profileHref: "/department-head/settings",
        onSignOut: () => {
          window.location.href = "/"
        },
      }}
      crumbs={crumbs}
      topbarTrailing={
        <NotificationBell
          items={notifications}
          allHref="/department-head/notifications"
          onMarkAllRead={markAllNotificationsRead}
        />
      }
    >
      <Outlet
        context={
          {
            notifications,
            markNotificationRead,
            markAllNotificationsRead,
          } satisfies DepartmentNotificationsContext
        }
      />
    </AppShell>
  )
}
