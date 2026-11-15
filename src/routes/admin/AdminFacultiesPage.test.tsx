import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminFacultiesPage from './AdminFacultiesPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: { GET: getMock },
  }
})

const faculties = [
  { id: 'faculty-1', name: 'Faculty of Computing', code: 'FC' },
]
const departments = [
  {
    id: 'department-1',
    faculty_id: 'faculty-1',
    name: 'Computer Science',
    code: 'CS',
  },
]

function result(data: unknown) {
  return { data, error: undefined, response: new Response(null) }
}

describe('AdminFacultiesPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockImplementation((path: string) =>
      Promise.resolve(
        result(path === '/rest/v1/faculty' ? faculties : departments),
      ),
    )
  })

  afterEach(() => cleanup())

  it('loads bounded read-only projections and displays the faculty hierarchy', async () => {
    render(<AdminFacultiesPage />)

    expect(await screen.findAllByText('Faculty of Computing')).toHaveLength(2)
    expect(screen.getByText('Computer Science')).toBeTruthy()
    expect(screen.getByText('FC')).toBeTruthy()
    expect(screen.getByText('CS')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()

    expect(getMock).toHaveBeenCalledWith('/rest/v1/faculty', {
      params: {
        query: {
          select: 'id,name,code',
          order: 'name.asc,id.asc',
          limit: 1000,
        },
      },
    })
    expect(getMock).toHaveBeenCalledWith('/rest/v1/department', {
      params: {
        query: {
          select: 'id,faculty_id,name,code',
          order: 'name.asc,id.asc',
          limit: 1000,
        },
      },
    })
  })

  it('shows an explicit catalog error and retries the reads', async () => {
    let failFirstRequest = true
    getMock.mockImplementation((path: string) => {
      if (path === '/rest/v1/faculty' && failFirstRequest) {
        failFirstRequest = false
        return Promise.reject(new Error('Faculty catalog unavailable'))
      }
      return Promise.resolve(
        result(path === '/rest/v1/faculty' ? faculties : departments),
      )
    })

    render(<AdminFacultiesPage />)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Faculty catalog unavailable',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Computer Science')).toBeTruthy()
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(4))
  })
})
