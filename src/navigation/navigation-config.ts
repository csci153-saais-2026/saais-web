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
  UserIcon,
  UsersIcon,
} from '@/components/icons'
import type { NavSection } from '@/components/features/sidebar'
import type { SaaisRole } from '@/mocks/personas'

export const studentNav: NavSection = {
  label: 'Student',
  items: [
    { label: 'Dashboard', to: '/student', icon: GridIcon, end: true },
    { label: 'Curriculum checklist', to: '/student/checklist', icon: CheckIcon },
    { label: 'Grades', to: '/student/grades', icon: ChartIcon },
    { label: 'Enrollment history', to: '/student/enrollment-history', icon: CalendarIcon },
    { label: 'My profile', to: '/settings', icon: UserIcon },
  ],
}

export const adviserNav: NavSection = {
  label: 'Adviser',
  items: [
    { label: 'Advisees', to: '/adviser', icon: UsersIcon, end: true },
    { label: 'Encode grades', to: '/adviser/encode-grades', icon: PencilIcon },
    { label: 'Import grades', to: '/adviser/import-grades', icon: UploadIcon },
    { label: 'Grade flags', to: '/adviser/grade-flags', icon: FlagIcon },
    { label: 'Account settings', to: '/settings', icon: ShieldIcon },
  ],
}

export const deptHeadNav: NavSection = {
  label: 'Department Head',
  items: [
    { label: 'Curriculum transfers', to: '/department-head/curriculum-transfers', icon: SwapIcon },
    { label: 'Curricula', to: '/department-head/curricula', icon: BookIcon },
    { label: 'Equivalence', to: '/department-head/equivalence', icon: ListIcon },
    { label: 'Outside credits', to: '/department-head/outside-credits', icon: CheckIcon },
    { label: 'Students', to: '/department-head/students', icon: UsersIcon },
    { label: 'Adviser assignments', to: '/department-head/adviser-assignments', icon: SwapIcon },
    { label: 'Academic terms', to: '/department-head/academic-terms', icon: CalendarIcon },
    { label: 'Department reports', to: '/department-head/reports', icon: ChartIcon },
    { label: 'Audit log', to: '/department-head/audit-log', icon: NoteIcon },
    { label: 'Settings', to: '/department-head/settings', icon: ShieldIcon },
  ],
}

export const deptStaffNav: NavSection = {
  label: 'Department Staff',
  items: [
    { label: 'Operations overview', to: '/department-staff', icon: CalendarIcon, end: true },
    { label: 'Students', to: '/department-staff/students', icon: UsersIcon },
    { label: 'Adviser assignments', to: '/department-staff/adviser-assignments', icon: SwapIcon },
    { label: 'Curricula', to: '/department-staff/curricula', icon: BookIcon },
    { label: 'Course catalog', to: '/department-staff/courses', icon: BookIcon },
    { label: 'Settings', to: '/settings', icon: ShieldIcon },
  ],
}

export const deanNav: NavSection = {
  label: 'Dean',
  items: [
    { label: 'College overview', to: '/dean', icon: ChartIcon, end: true },
    { label: 'Faculty reports', to: '/dean/reports', icon: ChartIcon },
    { label: 'Students', to: '/dean/students', icon: UsersIcon },
    { label: 'Audit log', to: '/dean/audit-log', icon: NoteIcon },
    { label: 'Settings', to: '/settings', icon: ShieldIcon },
  ],
}

export const sysAdminNav: NavSection = {
  label: 'System Admin',
  items: [
    { label: 'System directory', to: '/admin', icon: UsersIcon, end: true },
    { label: 'Accounts and roles', to: '/admin/accounts', icon: ShieldIcon },
    { label: 'Programs', to: '/admin/programs', icon: ListIcon },
    { label: 'Audit log', to: '/admin/audit-log', icon: NoteIcon },
    { label: 'Settings', to: '/settings', icon: ShieldIcon },
  ],
}

export const navigationConfig: Record<SaaisRole, NavSection> = {
  student: studentNav,
  adviser: adviserNav,
  department_head: deptHeadNav,
  department_staff: deptStaffNav,
  dean: deanNav,
  admin: sysAdminNav,
}

/**
 * Builds navigation sections from assigned roles matching the shared PR #67 ordering.
 */
export function getNavigationSections(assignedRoles: readonly SaaisRole[]): NavSection[] {
  const roleSet = new Set(assignedRoles)
  const roleOrder: SaaisRole[] = [
    'student',
    'adviser',
    'department_head',
    'department_staff',
    'dean',
    'admin',
  ]
  return roleOrder
    .filter((role) => roleSet.has(role))
    .map((role) => navigationConfig[role])
}
