import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import AdminAccountsPage from './AdminAccountsPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', () => ({
  apiClient: { GET: getMock },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}))

const account = {
  profile: {
    id: 'profile-1',
    role: 'adviser',
    roles: ['adviser', 'department_head'],
    email: 'alex@vsu.edu.ph',
    full_name: 'Alex Adviser',
    student_number: null,
    status: 'active',
    invitation_status: 'accepted',
    faculty_id: 'faculty-1',
    department_id: 'department-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  role_assignments: [
    {
      id: 'role-1',
      profile_id: 'profile-1',
      role: 'adviser',
      faculty_id: 'faculty-1',
      department_id: 'department-1',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'role-2',
      profile_id: 'profile-1',
      role: 'department_head',
      faculty_id: 'faculty-1',
      department_id: 'department-1',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  student_organization: null,
} as const

const faculties = [{ id: 'faculty-1', name: 'Faculty of Computing' }]
const departments = [
  {
    id: 'department-1',
    name: 'Computer Science',
    faculty_id: 'faculty-1',
  },
  {
    id: 'department-2',
    name: 'Agriculture',
    faculty_id: 'faculty-2',
  },
]

describe('AdminAccountsPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    HTMLElement.prototype.scrollIntoView = vi.fn()
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === '/functions/v1/accounts'
            ? [account]
            : path === '/rest/v1/faculty'
              ? faculties
              : departments,
        response: new Response(),
      }),
    )
  })

  afterEach(cleanup)

  it('loads a bounded account page with roles, organization, and lifecycle states', async () => {
    render(<AdminAccountsPage />)

    expect(await screen.findByText('Alex Adviser')).toBeTruthy()
    expect(screen.getByText('alex@vsu.edu.ph')).toBeTruthy()
    expect(screen.getByText('Faculty of Computing / Computer Science')).toBeTruthy()
    expect(screen.getByText('Adviser')).toBeTruthy()
    expect(screen.getByText('Department Head')).toBeTruthy()
    expect(screen.getByText('Accepted')).toBeTruthy()
    expect(getMock).toHaveBeenCalledWith(
      '/functions/v1/accounts',
      expect.objectContaining({
        params: {
          query: { limit: 21, offset: 0 },
        },
      }),
    )
  })

  it('sends search and role filters to the list operation', async () => {
    render(<AdminAccountsPage />)
    await screen.findByText('Alex Adviser')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search accounts' }), {
      target: { value: 'alex' },
    })
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/accounts',
        expect.objectContaining({
          params: {
            query: { limit: 21, offset: 0, search: 'alex' },
          },
        }),
      )
    })

    fireEvent.click(screen.getByRole('combobox', { name: 'Role' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Adviser' }))
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/accounts',
        expect.objectContaining({
          params: {
            query: { limit: 21, offset: 0, search: 'alex', role: 'adviser' },
          },
        }),
      )
    })
  })

  it('shows explicit empty and request error states', async () => {
    getMock.mockImplementation((path: string) =>
      path === '/functions/v1/accounts'
        ? Promise.resolve({ data: [], response: new Response() })
        : Promise.resolve({ data: [], response: new Response() }),
    )
    const { unmount } = render(<AdminAccountsPage />)
    expect(
      await screen.findByText('No accounts match these search and filter values.'),
    ).toBeTruthy()

    unmount()
    getMock.mockImplementation((path: string) =>
      path === '/functions/v1/accounts'
        ? Promise.reject(new Error('Accounts unavailable'))
        : Promise.resolve({ data: [], response: new Response() }),
    )
    render(<AdminAccountsPage />)
    const error = await screen.findByRole('alert')
    expect(error.textContent).toContain('Accounts unavailable')
  })

  it('requests the next bounded page only when another row exists', async () => {
    const pageRows = Array.from({ length: 21 }, (_, index) => ({
      ...account,
      profile: { ...account.profile, id: `profile-${index}` },
      role_assignments: account.role_assignments.map((assignment) => ({
        ...assignment,
        profile_id: `profile-${index}`,
      })),
    }))
    getMock.mockImplementation((path: string, options?: { params?: { query?: { offset?: number } } }) =>
      Promise.resolve({
        data:
          path === '/functions/v1/accounts'
            ? options?.params?.query?.offset === 20
              ? [pageRows[20]]
              : pageRows
            : path === '/rest/v1/faculty'
              ? faculties
              : departments,
        response: new Response(),
      }),
    )

    render(<AdminAccountsPage />)
    await screen.findAllByText('Alex Adviser')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/accounts',
        expect.objectContaining({
          params: { query: { limit: 21, offset: 20 } },
        }),
      )
    })
  })
})
