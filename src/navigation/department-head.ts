import { BookIcon, CalendarIcon, ChartIcon, CheckIcon, ListIcon, NoteIcon, ShieldIcon, SwapIcon, UsersIcon } from "@/components/icons"
import type { NavSection } from "@/components/features/sidebar"

export const deptHeadNav: NavSection = {
  title: "Department Head",
  items: [
    { label: "Curriculum transfers", href: "/department-head/curriculum-transfers", icon: SwapIcon },
    { label: "Curricula", href: "/department-head/curricula", icon: BookIcon },
    { label: "Equivalence", href: "/department-head/equivalence", icon: ListIcon },
    { label: "Outside credits", href: "/department-head/outside-credits", icon: CheckIcon },
    { label: "Students", href: "/department-head/students", icon: UsersIcon },
    { label: "Adviser assignments", href: "/department-head/adviser-assignments", icon: SwapIcon },
    { label: "Academic terms", href: "/department-head/academic-terms", icon: CalendarIcon },
    { label: "Department reports", href: "/department-head/reports", icon: ChartIcon },
    { label: "Audit log", href: "/department-head/audit-log", icon: NoteIcon },
    { label: "Settings", href: "/department-head/settings", icon: ShieldIcon },
  ],
}
