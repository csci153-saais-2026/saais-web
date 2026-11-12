import { ChartIcon, NoteIcon, UsersIcon } from "@/components/icons"
import type { NavSection } from "@/components/features/sidebar"

export const deanNav: NavSection = {
  title: "Dean",
  items: [
    { label: "Faculty reports", href: "/dean/faculty-reports", icon: ChartIcon },
    { label: "Students", href: "/dean/students", icon: UsersIcon },
    { label: "Audit log", href: "/dean/audit-log", icon: NoteIcon },
  ],
}
