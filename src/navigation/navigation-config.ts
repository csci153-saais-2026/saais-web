import type { NavSection } from "@/components/features/sidebar"
import { studentNav } from "@/navigation/student"
import { adviserNav } from "@/navigation/adviser"
import { deptHeadNav } from "@/navigation/department-head"
import { deptStaffNav } from "@/navigation/department-staff"
import { deanNav } from "@/navigation/dean"
import { sysAdminNav } from "@/navigation/admin"

export const navigationConfig = {
  student: studentNav,
  adviser: adviserNav,
  department_head: deptHeadNav,
  department_staff: deptStaffNav,
  dean: deanNav,
  admin: sysAdminNav,
} satisfies Record<string, NavSection>

export type NavigationRole = keyof typeof navigationConfig
