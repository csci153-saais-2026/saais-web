import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import AdminFacultiesPage from './AdminFacultiesPage'

const { getMock, postMock, patchMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: { GET: getMock, POST: postMock, PATCH: patchMock },
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
    postMock.mockReset()
    patchMock.mockReset()
    getMock.mockImplementation((path: string) =>
      Promise.resolve(
        result(path === '/rest/v1/faculty' ? faculties : departments),
      ),
    )
    postMock.mockResolvedValue(result(faculties[0]))
    patchMock.mockResolvedValue(result(faculties[0]))
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

  it('validates faculty creation and sends it through the catalog operation', async () => {
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Add faculty' }))

    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Add faculty',
      }),
    )
    expect(
      await screen.findByText('Enter a name between 2 and 250 characters.'),
    ).toBeTruthy()
    expect(postMock).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Faculty name'), {
      target: { value: 'Faculty of Arts' },
    })
    fireEvent.change(screen.getByLabelText('Faculty code'), {
      target: { value: 'FA' },
    })
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Add faculty',
      }),
    )

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/faculty',
        { body: { name: 'Faculty of Arts', code: 'FA' } },
      )
    })
  })

  it('updates a faculty through its transactional catalog operation', async () => {
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Faculty of Computing' }))
    fireEvent.change(await screen.findByLabelText('Faculty name'), {
      target: { value: 'Faculty of Computing and Design' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save faculty' }))

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/faculty/{id}',
        {
          params: { path: { id: 'faculty-1' } },
          body: {
            name: 'Faculty of Computing and Design',
            code: 'FC',
          },
        },
      )
    })
  })
})
