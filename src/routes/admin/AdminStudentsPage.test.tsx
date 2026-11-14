import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminStudentsPage from './AdminStudentsPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', () => ({
  apiClient: { GET: getMock },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}))

const student = {
  student_id: 'student-1',
  student_number: '24-1-01798',
  full_name: 'Alex Student',
  email: 'alex.student@vsu.edu.ph',
  avatar_url: null,
  status: 'active',
  faculty_id: 'faculty-1',
  faculty_name: 'Faculty of Computing',
  department_id: 'department-1',
  department_name: 'Department of Computer Science and Technology',
  program_id: 'program-1',
  program_code: 'BSCS',
  program_name: 'Computer Science',
  curriculum_version_id: 'curriculum-1',
  curriculum_label: 'BSCS 2024-2025 v1',
  entry_year: 2024,
  year_level: 3,
  gwa: 1.75,
  earned_units: 36,
  required_units: 162,
  standing: 'good_standing',
  is_delinquent: false,
  deficiencies_count: 1,
  open_inc_count: 1,
  lapsed_inc_count: 0,
  nearest_inc_deadline: null,
  nearest_inc_days_remaining: null,
  open_flags_count: 1,
  assignment_status: 'active',
  adviser_id: null,
  adviser_name: null,
  adviser_assigned_since: null,
  handover_label: null,
  last_activity_at: null,
} as const

function roster(items = [student], totalCount = items.length) {
  return {
    total_count: totalCount,
    unassigned_count: 0,
    with_deficiencies_count: 1,
    flagged_count: 1,
    open_inc_students_count: 1,
    standing_counts: {
      good_standing: totalCount,
      warning: 0,
      probation: 0,
      dismissed: 0,
    },
    items,
  }
}

const faculties = [{ id: 'faculty-1', name: 'Faculty of Computing' }]
const programs = [{ id: 'program-1', code: 'BSCS', name: 'Computer Science' }]

describe('AdminStudentsPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === '/functions/v1/students'
            ? roster()
            : path === '/rest/v1/faculty'
              ? faculties
              : programs,
        response: new Response(),
      }),
    )
  })

  afterEach(cleanup)

  it('loads the bounded roster and renders the directory columns', async () => {
    render(<AdminStudentsPage />)

    expect(await screen.findByText('Alex Student')).toBeTruthy()
    expect(screen.getByText('24-1-01798')).toBeTruthy()
    expect(screen.getByText('BSCS 2024-2025 v1')).toBeTruthy()
    expect(screen.getByText('1.75')).toBeTruthy()
    expect(screen.getByText('Good standing')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /Open flags/i })).toBeTruthy()
    expect(getMock).toHaveBeenCalledWith(
      '/functions/v1/students',
      expect.objectContaining({
        params: {
          query: expect.objectContaining({
            limit: 20,
            offset: 0,
            sort_by: 'full_name',
            sort_dir: 'asc',
          }),
        },
      }),
    )
  })

  it('sends search and uses server pagination', async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === '/functions/v1/students'
            ? roster([student], 21)
            : path === '/rest/v1/faculty'
              ? faculties
              : programs,
        response: new Response(),
      }),
    )
    render(<AdminStudentsPage />)

    await screen.findByText('Alex Student')
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search students' }), {
      target: { value: 'alex' },
    })

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ search: 'alex', limit: 20, offset: 0 }),
          },
        }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ search: 'alex', limit: 20, offset: 20 }),
          },
        }),
      )
    })
  })

  it('shows the request error and allows retrying', async () => {
    let failFirstRosterRequest = true
    getMock.mockImplementation((path: string) => {
      if (path === '/functions/v1/students' && failFirstRosterRequest) {
        failFirstRosterRequest = false
        return Promise.reject(new Error('Roster request failed'))
      }
      return Promise.resolve({
        data:
          path === '/functions/v1/students'
            ? roster()
            : path === '/rest/v1/faculty'
              ? faculties
              : programs,
        response: new Response(),
      })
    })
    render(<AdminStudentsPage />)

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Roster request failed',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Alex Student')).toBeTruthy()
  })

  it('shows a loading state while the roster request is pending', () => {
    getMock.mockImplementation(() => new Promise(() => {}))
    render(<AdminStudentsPage />)

    expect(screen.getByRole('status').textContent).toContain(
      'Loading student roster',
    )
  })

  it('distinguishes an empty roster from an empty filtered result', async () => {
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === '/functions/v1/students'
            ? roster([], 0)
            : path === '/rest/v1/faculty'
              ? faculties
              : programs,
        response: new Response(),
      }),
    )
    render(<AdminStudentsPage />)

    expect(
      await screen.findByText('No students are available in the roster.'),
    ).toBeTruthy()
  })

  it('shows a no-match state when a search has no results', async () => {
    let matching = true
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path === '/functions/v1/students'
            ? matching
              ? roster()
              : roster([], 0)
            : path === '/rest/v1/faculty'
              ? faculties
              : programs,
        response: new Response(),
      }),
    )
    render(<AdminStudentsPage />)
    await screen.findByText('Alex Student')

    matching = false
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search students' }), {
      target: { value: 'nobody' },
    })

    expect(
      await screen.findByText('No students match these search criteria.'),
    ).toBeTruthy()
  })

  it('uses the responsive table layout for narrow screens', async () => {
    const { container } = render(<AdminStudentsPage />)

    await screen.findByText('Alex Student')
    expect(container.querySelector('table')?.classList.contains('stack-table')).toBe(
      true,
    )
    expect(screen.getByText('1 open')).toBeTruthy()
    expect(screen.getByText('(1 INC)')).toBeTruthy()
  })

  it('filters the roster by faculty and program', async () => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    render(<AdminStudentsPage />)
    await screen.findByText('Alex Student')

    fireEvent.click(screen.getByRole('combobox', { name: 'Faculty / college' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Faculty of Computing' }))
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ faculty_id: 'faculty-1' }),
          },
        }),
      )
    })

    fireEvent.click(screen.getByRole('combobox', { name: 'Program' }))
    fireEvent.click(await screen.findByRole('option', { name: 'BSCS · Computer Science' }))
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              faculty_id: 'faculty-1',
              program_id: 'program-1',
            }),
          },
        }),
      )
    })
  })

  it('filters by academic standing, deficiencies, INC, and open flags', async () => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    render(<AdminStudentsPage />)
    await screen.findByText('Alex Student')

    fireEvent.click(screen.getByRole('combobox', { name: 'Academic standing' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Warning' }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Deficiencies' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Has deficiencies' }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Open INC' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Has open INC' }))
    fireEvent.click(screen.getByRole('combobox', { name: 'Open flags' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Has open flags' }))

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              standing: 'warning',
              has_deficiencies: true,
              has_open_inc: true,
              has_open_flags: true,
            }),
          },
        }),
      )
    })
  })

  it('sorts the roster by supported table columns', async () => {
    render(<AdminStudentsPage />)
    await screen.findByText('Alex Student')

    fireEvent.click(screen.getByRole('button', { name: 'Sort by Student number' }))
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              sort_by: 'student_number',
              sort_dir: 'asc',
            }),
          },
        }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: /Sort by Student number/ }))
    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith(
        '/functions/v1/students',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              sort_by: 'student_number',
              sort_dir: 'desc',
            }),
          },
        }),
      )
    })
  })
})
