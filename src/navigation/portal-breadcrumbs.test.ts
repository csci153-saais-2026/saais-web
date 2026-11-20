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
    expect(crumbs.map(crumb => crumb.label)).toEqual(['Advising workspace', 'Advisees', 'Selected student', label])
    expect(crumbs[2].to).toBe('/adviser/advisee/selected-id')
  })
})

describe('dean portal breadcrumbs', () => {
  it('labels top-level dean routes from navigation config', () => {
    const crumbs = getPortalBreadcrumbs(
      '/dean/reports', 'dean', 'Office of the Dean', '/dean/reports', '',
    )
    expect(crumbs).toEqual([
      { label: 'Office of the Dean', to: '/dean/reports' },
      { label: 'Faculty reports' },
    ])
  })
})
