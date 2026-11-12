import { BookIcon, CalendarIcon, ShieldIcon, SwapIcon, UsersIcon } from "@/components/icons"
import type { NavSection } from "@/components/features/sidebar"

export const deptStaffNav: NavSection = {
  title: "Department Staff",
  items: [
    { label: "Students", href: "/department-staff/students", icon: UsersIcon },
    { label: "Adviser assignments", href: "/department-staff/adviser-assignments", icon: SwapIcon },
    { label: "Academic terms", href: "/department-staff/academic-terms", icon: CalendarIcon },
    { label: "Curricula", href: "/department-staff/curricula", icon: BookIcon },
    { label: "Course catalog", href: "/department-staff/course-catalog", icon: BookIcon },
    { label: "Accounts and roles", href: "/department-staff/accounts-roles", icon: ShieldIcon },
  ],
}
