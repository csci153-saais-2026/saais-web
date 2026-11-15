import { describe, expect, it } from 'vitest'
import { getPortalBreadcrumbs } from './portal-breadcrumbs'

describe('student record route labels', () => {
  it.each([
    ['grades/', 'Grades'],
    ['GRADES', 'Grades'],
    ['history', 'Audit log'],
    ['constructor', 'Page not found'],
  ])('labels the %s section consistently with route matching', (section, label) => {
    const crumbs = getPortalBreadcrumbs(
      `/adviser/advisee/selected-id/${section}`, 'adviser', 'Adviser Portal', '/adviser', 'Selected student',
    )
    expect(crumbs.map(crumb => crumb.label)).toEqual(['Adviser', 'Advisees', 'Selected student', label])
    expect(crumbs[2].to).toBe('/adviser/advisee/selected-id')
  })
})
