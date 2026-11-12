import { Outlet, useNavigate } from 'react-router'
import { AppShell } from '@/components/features/app-shell'
import type { NavSection } from '@/components/features/sidebar'
import {
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
} from '@/components/icons'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_DEFAULT_ROUTE, type RoleScope } from '@/lib/auth/auth-service'
import type { SaaisRole } from '@/mocks/personas'

const ROLE_LABELS: Readonly<Record<SaaisRole, string>> = {
  student: 'Student Portal',
  adviser: 'Adviser',
  department_head: 'Department Head',
  department_staff: 'Department Staff',
  dean: 'Dean',
  admin: 'System Admin',
}

function getInitials(fullName: string): string {
  const parts = fullName
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function buildNavSectionsForRoles(
  roles: readonly SaaisRole[],
  roleScopes: readonly RoleScope[],
): NavSection[] {
  const isMultiRole = roles.length > 1
  const sections: NavSection[] = []

  if (roles.includes('student')) {
    sections.push({
      label: 'STUDENT',
      collapsible: isMultiRole,
      defaultOpen: true,
      items: [
        { label: 'Dashboard', to: '/student', icon: ChartIcon, end: true },
        { label: 'Account Settings', to: '/settings', icon: CheckIcon },
      ],
    })
  }

  if (roles.includes('adviser')) {
    sections.push({
      label: 'ADVISER',
      collapsible: isMultiRole,
      defaultOpen: true,
      items: [
        { label: 'Advisees', to: '/adviser', icon: BookIcon, end: true },
        { label: 'Account Settings', to: '/settings', icon: CheckIcon },
      ],
    })
  }

  if (roles.includes('department_head')) {
    const scope = roleScopes.find((s) => s.role === 'department_head')
    sections.push({
      label: scope?.departmentId ? 'DEPARTMENT HEAD' : 'DEPARTMENT HEAD',
      collapsible: isMultiRole,
      defaultOpen: true,
      items: [
        {
          label: 'Department Overview',
          to: '/department-head',
          icon: ChartIcon,
          end: true,
        },
        { label: 'Account Settings', to: '/settings', icon: CheckIcon },
      ],
    })
  }

  if (roles.includes('department_staff')) {
    sections.push({
      label: 'DEPARTMENT STAFF',
      collapsible: isMultiRole,
      defaultOpen: true,
      items: [
        {
          label: 'Encoding & Operations',
          to: '/department-staff',
          icon: CalendarIcon,
          end: true,
        },
        { label: 'Account Settings', to: '/settings', icon: CheckIcon },
      ],
    })
  }

  if (roles.includes('dean')) {
    sections.push({
      label: 'DEAN',
      collapsible: isMultiRole,
      defaultOpen: true,
      items: [
        { label: 'College Overview', to: '/dean', icon: ChartIcon, end: true },
        { label: 'Account Settings', to: '/settings', icon: CheckIcon },
      ],
    })
  }

  if (roles.includes('admin')) {
    sections.push({
      label: 'ADMIN',
      collapsible: isMultiRole,
      defaultOpen: true,
      items: [
        { label: 'Administration', to: '/admin', icon: BellIcon, end: true },
        { label: 'Account Settings', to: '/settings', icon: CheckIcon },
      ],
    })
  }

  return sections
}

export function AuthenticatedPortalLayout() {
  const { user, roles, roleScopes, activeRole, isLoading, signOut } = useAuth()
  const navigate = useNavigate()

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-primary">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-muted-foreground">
            Loading workspace…
          </span>
        </div>
      </div>
    )
  }

  const currentRole = activeRole ?? roles[0] ?? user.primaryRole
  const portalLabel = ROLE_LABELS[currentRole] ?? 'SAAIS'
  const homeHref = ROLE_DEFAULT_ROUTE[currentRole] ?? '/settings'
  const sections = buildNavSectionsForRoles(roles, roleScopes)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      sidebar={{
        portalLabel,
        sections,
        user: {
          name: user.fullName,
          subtitle: user.email,
          initials: getInitials(user.fullName),
        },
        profileHref: '/settings',
        onSignOut: () => void handleSignOut(),
      }}
      crumbs={[{ label: portalLabel, to: homeHref }]}
    >
      <Outlet />
    </AppShell>
  )
}
