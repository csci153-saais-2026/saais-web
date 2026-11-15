import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { AuthenticatedPortalLayout } from '@/components/features/AuthenticatedPortalLayout'
import { AdviserLayout } from '@/routes/adviser/AdviserLayout'
import { AdviserPage } from '@/routes/adviser/Adviser'
import AdviserDashboard from '@/routes/adviser/dashboard/AdviserDashboard'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const auth = vi.hoisted(() => ({
  user: { id: 'adviser-one', fullName: 'Ada Example', email: 'ada@example.edu.ph', primaryRole: 'adviser' },
  roles: ['adviser'],
  roleAssignments: [{ role: 'adviser' }],
  activeRole: 'adviser',
  isLoading: false,
  isAllowedToEnter: true,
  signOut: vi.fn(),
  setActiveRole: vi.fn(),
}))
const getProfile = vi.hoisted(() => vi.fn())
const getNotifications = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], response: new Response() }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }))
vi.mock('@/lib/api', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  apiClient: { GET: (path: string, ...args: unknown[]) => path === '/rest/v1/notification' ? getNotifications(path, ...args) : getProfile(path, ...args) },
}))
vi.mock('@/routes/adviser/dashboard/adviser-dashboard.api', () => ({
  getSchoolTerms: vi.fn().mockResolvedValue([]),
  getAdviserDashboard: vi.fn().mockResolvedValue({
    total_advisees: 2, mean_gwa: 1.75, standing_counts: {},
  }),
}))

function profileResult(name = 'Elena Santos', studentNumber = '2024-00871') {
  return { data: [{ id: '10000000-0000-4000-8000-000000000001', full_name: name, student_number: studentNumber }], response: new Response() }
}

beforeEach(() => {
  auth.user.id = 'adviser-one'
  auth.roles = ['adviser']
  auth.roleAssignments = [{ role: 'adviser' }]
  auth.activeRole = 'adviser'
  getProfile.mockReset().mockResolvedValue(profileResult())
  auth.setActiveRole.mockClear()
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function setup(path = '/adviser/dashboard') {
  return render(withQueryClient(viewRoot(path)))
}

function withQueryClient(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>
}

function viewRoot(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthenticatedPortalLayout />}>
          <Route path="/notifications" element={<p>Notifications content</p>} />
          <Route element={<ProtectedRoute allowedRoles={['adviser']} />}>
            <Route path="/adviser" element={<AdviserLayout />}>
              <Route path="dashboard" element={<AdviserDashboard />} />
              {['advisees', 'encode-grades', 'import-grades', 'grade-flags'].map(path =>
                <Route key={path} path={path} element={<p>{path} content</p>} />
              )}
              <Route path="advisee/:id">
                <Route index element={<AdviserPage title="Checklist" tab="checklist" sample={false}><p>Checklist content</p></AdviserPage>} />
                {['grades', 'notes'].map(tab =>
                  <Route key={tab} path={tab} element={<AdviserPage title={tab} tab={tab} sample={false}><p>{tab} content</p></AdviserPage>} />
                )}
              </Route>
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['dean']} />}>
            <Route path="/dean/*" element={<p>Dean content</p>} />
          </Route>
        </Route>
      </Routes>
      <Link to="/adviser/advisee/2024-00871/grades">Open selected record</Link>
      <Link to="/adviser/advisee/2022-01188/notes">Open another record</Link>
    </MemoryRouter>
  )
}

function trail() {
  const breadcrumb = document.querySelector('[data-slot="breadcrumb"]')!
  const lists = breadcrumb.querySelectorAll('ol[data-slot="breadcrumb-list"]')
  return lists[0] as HTMLOListElement
}

function expectOneBreadcrumb(container: HTMLElement) {
  expect(container.querySelectorAll('[data-slot="breadcrumb"]')).toHaveLength(1)
  expect(container.querySelectorAll('header')).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Open navigation' })).toHaveLength(1)
  expect(screen.getByRole('navigation', { name: 'breadcrumb' }).closest('header')).toBeTruthy()
}

describe('Adviser breadcrumbs in the shared top bar', () => {
  it('renders Adviser > Dashboard above the real dashboard with one breadcrumb', async () => {
    const { container } = setup()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expectOneBreadcrumb(container)
    expect(within(trail()).getByRole('link', { name: 'Adviser' }).getAttribute('href')).toBe('/adviser/dashboard')
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Dashboard')
    expect(trail().querySelectorAll('[aria-current="page"]')).toHaveLength(1)
    expect(getProfile).not.toHaveBeenCalled()
  })

  it.each([
    ['advisees', 'Advisees'], ['encode-grades', 'Encode grades'], ['import-grades', 'Import grades'],
    ['grade-flags', 'Grade flags'],
  ])('derives the %s breadcrumb from the route', (route, label) => {
    const { container } = setup(`/adviser/${route}`)
    expectOneBreadcrumb(container)
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe(label)
  })

  it('uses the shared universal notifications route and breadcrumb', () => {
    const { container } = setup('/notifications')
    expect(screen.getByText('Notifications content')).toBeTruthy()
    expectOneBreadcrumb(container)
    expect(Array.from(trail().querySelectorAll('[data-slot="breadcrumb-item"]')).map(item => item.textContent))
      .toEqual(['Adviser', 'Notifications'])
  })

  it('resolves the selected student, exposes all parents, and navigates between routes', async () => {
    const { container } = setup()
    fireEvent.click(screen.getByRole('link', { name: 'Open selected record' }))
    const student = await within(trail()).findByRole('link', { name: 'Elena Santos' })
    expect(student.getAttribute('href')).toBe('/adviser/advisee/2024-00871')
    expect(getProfile.mock.calls[0][1].params.query).toEqual({ student_number: 'eq.2024-00871', select: 'id,full_name,student_number', limit: 1 })
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Grades')
    expectOneBreadcrumb(container)

    expect(Array.from(trail().querySelectorAll('[data-slot="breadcrumb-item"]')).map(item => item.textContent))
      .toEqual(['Adviser', 'Advisees', 'Elena Santos', 'Grades'])
    expect(within(trail()).getByRole('link', { name: 'Adviser' }).getAttribute('href')).toBe('/adviser/dashboard')
    fireEvent.click(within(trail()).getByRole('link', { name: 'Advisees' }))
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Advisees')
    expect(screen.queryByRole('button', { name: 'Show previous pages' })).toBeNull()
    fireEvent.click(within(trail()).getByRole('link', { name: 'Adviser' }))
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Dashboard')
  })

  it('uses a neutral label while loading and when the record is unavailable', async () => {
    let resolve!: (value: { data: []; response: Response }) => void
    getProfile.mockImplementation(() => new Promise(value => { resolve = value }))
    setup('/adviser/advisee/2024-00871/grades')
    expect(within(trail()).getByRole('link', { name: 'Student record' })).toBeTruthy()
    act(() => resolve({ data: [], response: new Response() }))
    expect(within(trail()).getByRole('link', { name: 'Student record' })).toBeTruthy()
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Grades')
  })

  it('looks up UUID records by ID and links the student to the default Checklist section', async () => {
    setup('/adviser/advisee/10000000-0000-4000-8000-000000000001')
    await within(trail()).findByRole('link', { name: 'Elena Santos' })
    expect(getProfile.mock.calls[0][1].params.query.id).toBe('eq.10000000-0000-4000-8000-000000000001')
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Checklist')
    expect(Array.from(trail().querySelectorAll('[data-slot="breadcrumb-item"]')).map(item => item.textContent))
      .toEqual(['Adviser', 'Advisees', 'Elena Santos', 'Checklist'])
  })

  it('clears the previous student immediately on record or account changes and ignores late responses', async () => {
    let resolve!: (value: ReturnType<typeof profileResult>) => void
    getProfile.mockResolvedValueOnce(profileResult())
      .mockImplementationOnce(() => new Promise(value => { resolve = value }))
      .mockResolvedValueOnce(profileResult('Jordan Flores', '2022-01188'))
    const view = setup('/adviser/advisee/2024-00871/grades')
    await within(trail()).findByRole('link', { name: 'Elena Santos' })
    fireEvent.click(screen.getByRole('link', { name: 'Open another record' }))
    await within(trail()).findByRole('link', { name: 'Student record' })
    expect(within(trail()).queryByText('Elena Santos')).toBeNull()
    auth.user.id = 'adviser-two'
    view.rerender(withQueryClient(viewRoot('/adviser/advisee/2022-01188/notes')))
    expect(getProfile.mock.calls[1][1].signal.aborted).toBe(true)
    await within(trail()).findByRole('link', { name: 'Jordan Flores' })
    act(() => resolve(profileResult('Previous account student', '2022-01188')))
    expect(within(trail()).queryByText('Previous account student')).toBeNull()
  })

  it('keeps a neutral label on lookup errors', async () => {
    getProfile.mockRejectedValue(new Error('Unavailable'))
    setup('/adviser/advisee/missing/notes')
    await waitFor(() => expect(getProfile).toHaveBeenCalledOnce())
    expect(within(trail()).getByRole('link', { name: 'Student record' })).toBeTruthy()
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Notes')
  })

  it('updates the trail between authorized portals without changing a multi-role account', () => {
    auth.roles = ['dean', 'adviser']
    auth.roleAssignments = [{ role: 'dean' }, { role: 'adviser' }]
    auth.activeRole = 'dean'
    const assignments = structuredClone(auth.roleAssignments)
    const { container } = setup()
    expect(trail().textContent).toBe('AdviserDashboard')
    fireEvent.click(screen.getByRole('link', { name: 'Faculty reports' }))
    expect(screen.getByText('Dean content')).toBeTruthy()
    expect(trail().textContent).toBe('Office of the DeanFaculty reports')
    fireEvent.click(screen.getByRole('link', { name: 'Advisees' }))
    expect(trail().textContent).toBe('AdviserAdvisees')
    expectOneBreadcrumb(container)
    expect(auth.activeRole).toBe('dean')
    expect(auth.roleAssignments).toEqual(assignments)
    expect(auth.setActiveRole).not.toHaveBeenCalled()
  })

  it('shows the complete trail on mobile and preserves the navigation drawer', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: true, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    }))
    const { container } = setup('/adviser/advisee/2024-00871/grades')
    await within(trail()).findByRole('link', { name: 'Elena Santos' })
    expectOneBreadcrumb(container)
    expect(Array.from(trail().querySelectorAll('[data-slot="breadcrumb-item"]')).map(item => item.textContent))
      .toEqual(['Adviser', 'Advisees', 'Elena Santos', 'Grades'])
    expect(screen.queryByRole('button', { name: 'Show previous pages' })).toBeNull()
    fireEvent.click(within(trail()).getByRole('link', { name: 'Elena Santos' }))
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Checklist')
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Advisees' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trail().querySelector('[aria-current="page"]')?.textContent).toBe('Advisees')
    expectOneBreadcrumb(container)
  })
})
