import { navigationConfig, type NavigationRole } from "@/navigation/navigation-config"

/** Select every assigned role once, in the shared navigation order. */
export function getNavigationSections(assignments: readonly { role: NavigationRole }[]) {
  const roles = new Set(assignments.map(({ role }) => role))
  return (Object.keys(navigationConfig) as NavigationRole[])
    .filter(role => roles.has(role))
    .map(role => navigationConfig[role])
}
