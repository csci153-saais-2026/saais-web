import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthenticatedPortalLayout } from '@/components/features/AuthenticatedPortalLayout'
import * as sharedLayout from '@/layouts/AuthenticatedLayout'

const auth = vi.hoisted(() => ({
  user: { fullName: 'Ada Example', email: 'ada@example.edu.ph', primaryRole: 'dean' },
  roles: ['dean', 'adviser'],
  roleAssignments: [{ role: 'dean' }],
  activeRole: 'dean',
  isLoading: false,
  signOut: vi.fn().mockResolvedValue(undefined),
}))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
beforeEach(() => {
  auth.roleAssignments = [{ role: 'dean' }]
  auth.isLoading = false
  auth.signOut.mockClear()
  navigate.mockClear()
})

function setup() {
  return render(
    <MemoryRouter initialEntries={['/dean/reports']}>
      <Routes>
        <Route element={<AuthenticatedPortalLayout />}>
          <Route path="/dean/reports" element={<div>Report content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthenticatedPortalLayout integration', () => {
  it('uses actual assignments and renders account details, breadcrumbs, and the outlet in one shell', () => {
    const { container } = setup()
    expect(screen.getByText('Dean')).toBeTruthy()
    // A derived role list must not introduce a menu absent from actual assignments.
    expect(screen.queryByText('Adviser')).toBeNull()
    expect(screen.getByRole('link', { name: 'Faculty reports' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Ada Example')).toBeTruthy()
    expect(screen.getByText('ada@example.edu.ph')).toBeTruthy()
    expect(screen.getByText('AE')).toBeTruthy()
    expect(within(screen.getByRole('navigation', { name: 'breadcrumb' })).getByText('Office of the Dean')).toBeTruthy()
    expect(screen.getByText('Report content')).toBeTruthy()
    expect(container.querySelectorAll('[data-slot="sidebar"]')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Open navigation' })).toHaveLength(1)
  })

  it('forwards sign-out and redirects after it completes', async () => {
    let props: ComponentProps<typeof sharedLayout.AuthenticatedLayout> | undefined
    vi.spyOn(sharedLayout, 'AuthenticatedLayout').mockImplementation(value => {
      props = value
      return null
    })
    setup()
    await props?.sidebar?.onSignOut?.()
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('keeps the shell hidden while auth loads', () => {
    auth.isLoading = true
    setup()
    expect(screen.getByText(/Loading workspace/)).toBeTruthy()
    expect(screen.queryByText('Report content')).toBeNull()
    expect(screen.queryByText('Ada Example')).toBeNull()
  })
})
