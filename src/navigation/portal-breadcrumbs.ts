import { matchPath } from 'react-router'
import type { Crumb } from '@/components/features/topbar'
import { adviserNav, adviserRecordSections } from './adviser'
import { navigationConfig, type NavigationRole } from './navigation-config'

export function getPortalBreadcrumbs(
  pathname: string,
  role: NavigationRole,
  portalLabel: string,
  homeHref: string,
  studentLabel: string,
): Crumb[] {
  const root = { label: role === 'adviser' ? adviserNav.title! : portalLabel, to: homeHref }
  if (pathname === '/notifications') return [root, { label: 'Notifications' }]
  if (pathname === '/settings') return [root, { label: 'Settings' }]

  if (role === 'adviser') {
    const record = matchPath('/adviser/advisee/:id/*', pathname)
    if (record) {
      const recordHref = record.pathnameBase
      const section = record.params['*']?.replace(/\/+$/, '').toLowerCase() || 'checklist'
      return [
        { label: 'Advising workspace', to: '/adviser/dashboard' },
        { label: 'Advisees', to: '/adviser/advisees' },
        { label: studentLabel, to: recordHref },
        { label: Object.hasOwn(adviserRecordSections, section) ? adviserRecordSections[section] : 'Page not found' },
      ]
    }
    const item = adviserNav.items.find(item => matchPath(item.href, pathname))
    const label = item?.label
      ?? (matchPath('/adviser', pathname) ? 'Dashboard'
        : 'Page not found')
    return [{ ...root, to: '/adviser/dashboard' }, { label }]
  }

  const item = navigationConfig[role].items.find(item => matchPath(item.href, pathname))
  return item ? [root, { label: item.label }] : [root]
}
