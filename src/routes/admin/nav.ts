import { BookIcon, ListIcon, NoteIcon, ShieldIcon, UsersIcon } from "@/components/icons"
import type { NavSection } from "@/components/features/sidebar"

export const sysAdminNav: NavSection = {
  title: "System Admin",
  items: [
    { label: "Student directory", href: "/admin/student-directory", icon: UsersIcon },
    { label: "Accounts and roles", href: "/admin/accounts-roles", icon: ShieldIcon },
    { label: "Faculty & departments", href: "/admin/faculties-departments", icon: BookIcon },
    { label: "Programs", href: "/admin/programs", icon: ListIcon },
    { label: "Audit log", href: "/admin/audit-log", icon: NoteIcon },
    { label: "Settings", href: "/admin/settings", icon: ShieldIcon },
  ],
}
