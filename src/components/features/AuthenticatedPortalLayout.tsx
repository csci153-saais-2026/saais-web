import { matchPath, useLocation, useNavigate } from 'react-router'
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout'
import { useAuth } from '@/hooks/use-auth'
import { useStudentRecordLabel } from '@/hooks/use-student-record-label'
import { getPortalBreadcrumbs } from '@/navigation/portal-breadcrumbs'
import { ROLE_DEFAULT_ROUTE } from '@/lib/auth/auth-service'
import type { SaaisRole } from '@/mocks/personas'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationBell } from '@/components/features/notification-bell'

const ROLE_PORTAL_LABELS: Readonly<Record<SaaisRole, string>> = {
  student: 'Student Portal',
  adviser: 'Adviser Portal',
  department_head: 'Department Head',
  department_staff: 'Department Staff',
  dean: 'Office of the Dean',
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

/**
 * Dynamically resolves the portal role matching the active route pathname
 * so multi-role users see the correct shell title and breadcrumb when navigating
 * between their assigned portals.
 */
function resolveRoleFromPath(
  pathname: string,
  assignedRoles: readonly SaaisRole[],
  fallbackRole: SaaisRole,
): SaaisRole {
  if (pathname.startsWith('/student') && assignedRoles.includes('student')) {
    return 'student'
  }
  if (pathname.startsWith('/adviser') && assignedRoles.includes('adviser')) {
    return 'adviser'
  }
  if (
    (pathname.startsWith('/department-head') || pathname.startsWith('/dept-head')) &&
    assignedRoles.includes('department_head')
  ) {
    return 'department_head'
  }
  if (
    (pathname.startsWith('/department-staff') || pathname.startsWith('/staff')) &&
    assignedRoles.includes('department_staff')
  ) {
    return 'department_staff'
  }
  if (pathname.startsWith('/dean') && assignedRoles.includes('dean')) {
    return 'dean'
  }
  if (pathname.startsWith('/admin') && assignedRoles.includes('admin')) {
    return 'admin'
  }
  return assignedRoles.includes(fallbackRole) ? fallbackRole : assignedRoles[0] ?? fallbackRole
}

export function AuthenticatedPortalLayout() {
  const { user, roles, roleAssignments, activeRole, isLoading, isAllowedToEnter, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const currentRole = resolveRoleFromPath(location.pathname, roles, activeRole ?? roles[0] ?? user?.primaryRole ?? 'student')
  const notificationRoute = currentRole === 'adviser' ? '/adviser/notifications' : undefined
  const notifications = useNotifications(user?.id, isLoading || isAllowedToEnter === false, currentRole, notificationRoute)
  const recordMatch = matchPath('/adviser/advisee/:id/*', location.pathname)
  const studentLabel = useStudentRecordLabel(
    !isLoading && roles.includes('adviser') ? user?.id : undefined,
    recordMatch?.params.id,
  )

  if (isLoading || !user || isAllowedToEnter === false) {
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

  const portalLabel = ROLE_PORTAL_LABELS[currentRole] ?? 'SAAIS workspace'
  const homeHref = ROLE_DEFAULT_ROUTE[currentRole] ?? '/settings'
  const crumbs = getBreadcrumbs(location.pathname, currentRole, homeHref)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AuthenticatedLayout
      assignments={roleAssignments}
      sidebar={{
        portalLabel,
        user: {
          name: user.fullName,
          subtitle: user.email,
          initials: getInitials(user.fullName),
        },
        profileHref: '/settings',
        onSignOut: () => void handleSignOut(),
      }}
      crumbs={crumbs}
      topbarTrailing={<NotificationBell items={notifications.bellItems} allHref={notifications.allHref} onMarkAllRead={notifications.markAllRead} loading={notifications.loading} error={notifications.error} showUnreadCount={!notifications.capped} />}
    />
  )
}

function getBreadcrumbs(pathname: string, role: SaaisRole, homeHref: string) {
  const portalLabel = ROLE_PORTAL_LABELS[role]
  if (role === 'adviser') {
    const dashboard = { label: 'Dashboard', to: '/adviser/dashboard' }
    if (pathname === '/adviser/dashboard' || pathname === '/adviser') return [{ label: portalLabel, to: homeHref }, { ...dashboard, to: undefined }]
    if (pathname === '/adviser/advisees') return [{ label: portalLabel, to: homeHref }, { label: 'Advisees' }]
    const record = matchPath('/adviser/advisee/:id/*', pathname)
    if (record?.params.id) {
      const sections: Record<string, string> = { checklist: 'Checklist', grades: 'Grades', curriculum: 'Curriculum', advising: 'Advising', notes: 'Notes', history: 'Audit log' }
      const section = pathname.split('/').at(-1)
      return [{ label: portalLabel, to: homeHref }, { label: 'Advisees', to: '/adviser/advisees' }, { label: `Student ${record.params.id}`, to: pathname.slice(0, pathname.lastIndexOf('/')) }, ...(section && sections[section] ? [{ label: sections[section] }] : [])]
    }
    const adviserLabels: Record<string, string> = {
      '/adviser/encode-grades': 'Encode grades', '/adviser/import-grades': 'Import grades',
      '/adviser/grade-flags': 'Grade flags', '/adviser/notifications': 'Notifications',
    }
    const label = adviserLabels[pathname]
    if (label) return [{ label: portalLabel, to: homeHref }, { label }]
  }
  return [{ label: portalLabel, to: homeHref }]
}
