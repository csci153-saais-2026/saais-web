import { ChartIcon, CheckIcon, ClockIcon, GridIcon, UserIcon } from "@/components/icons"
import type { NavSection } from "@/components/features/sidebar"

export const studentNav: NavSection = {
  title: "Student",
  items: [
    { label: "Dashboard", href: "/student/dashboard", icon: GridIcon },
    { label: "Curriculum checklist", href: "/student/checklist", icon: CheckIcon },
    { label: "Grades", href: "/student/grades", icon: ChartIcon },
    { label: "Enrollment history", href: "/student/history", icon: ClockIcon },
    { label: "My profile", href: "/student/profile", icon: UserIcon },
  ],
}
