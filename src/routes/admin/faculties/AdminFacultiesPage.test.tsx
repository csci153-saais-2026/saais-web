import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { ApiClientError } from '@/lib/api'
import AdminFacultiesPage from './AdminFacultiesPage'

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: {
      GET: getMock,
      POST: postMock,
      PATCH: patchMock,
      DELETE: deleteMock,
    },
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    getMock.mockReset()
    postMock.mockReset()
    patchMock.mockReset()
    deleteMock.mockReset()
    getMock.mockImplementation((path: string) =>
      Promise.resolve(
        result(path === '/rest/v1/faculty' ? faculties : departments),
      ),
    )
    postMock.mockResolvedValue(result(faculties[0]))
    patchMock.mockResolvedValue(result(faculties[0]))
    deleteMock.mockResolvedValue(result(undefined))
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

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
          offset: 0,
        },
      },
    })
    expect(getMock).toHaveBeenCalledWith('/rest/v1/department', {
      params: {
        query: {
          select: 'id,faculty_id,name,code',
          order: 'name.asc,id.asc',
          limit: 1000,
          offset: 0,
        },
      },
    })
  })

  it('requests subsequent catalog pages before completing the load', async () => {
    const firstFacultyPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `faculty-${index}`,
      name: `Faculty ${index}`,
    }))
    const firstDepartmentPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `department-${index}`,
      faculty_id: 'faculty-0',
      name: `Department ${index}`,
    }))
    getMock.mockImplementation(
      (
        path: string,
        options?: { params?: { query?: { offset?: number } } },
      ) => {
        const offset = options?.params?.query?.offset ?? 0
        if (path === '/rest/v1/faculty') {
          return offset === 0
            ? Promise.resolve(result(firstFacultyPage))
            : new Promise(() => {})
        }
        return offset === 0
          ? Promise.resolve(result(firstDepartmentPage))
          : new Promise(() => {})
      },
    )

    const { unmount } = render(<AdminFacultiesPage />)

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith(
        '/rest/v1/faculty',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ limit: 1000, offset: 1000 }),
          },
        }),
      )
      expect(getMock).toHaveBeenCalledWith(
        '/rest/v1/department',
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ limit: 1000, offset: 1000 }),
          },
        }),
      )
    })
    unmount()
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
    expect(screen.getByRole('button', { name: 'Add faculty' })).toBeTruthy()
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

  it('requires a parent faculty and creates departments through the catalog operation', async () => {
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Add department' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Department name'), {
      target: { value: 'Information Systems' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Add department' }),
    )
    expect(await screen.findByText('Select a faculty.')).toBeTruthy()
    expect(postMock).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('combobox', { name: 'Parent faculty' }))
    fireEvent.click(
      await screen.findByRole('option', { name: 'Faculty of Computing' }),
    )
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Add department' }),
    )

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/department',
        {
          body: {
            faculty_id: 'faculty-1',
            name: 'Information Systems',
            code: null,
          },
        },
      )
    })
  })

  it('updates the department parent through the catalog operation', async () => {
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Computer Science' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Department name'), {
      target: { value: 'Computing' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save department' }))

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/department/{id}',
        {
          params: { path: { id: 'department-1' } },
          body: {
            faculty_id: 'faculty-1',
            name: 'Computing',
            code: 'CS',
          },
        },
      )
    })
  })

  it('explains faculty deletion conflicts without cascading to departments', async () => {
    deleteMock.mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: 'DEPENDENT_RECORDS_EXIST',
        message: 'Conflict',
        details: null,
        hint: null,
        retryAfterSeconds: null,
        isAuthError: false,
        isForbidden: false,
        isNotFound: false,
        isConflict: true,
        isRateLimited: false,
        isNetworkError: false,
      }),
    )
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Faculty of Computing' }),
    )
    expect(await screen.findByText(/currently has 1 department/)).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete faculty',
      }),
    )

    expect(
      await screen.findByText(
        'This faculty cannot be deleted while departments, role assignments, or historical academic records still reference it. No related records were deleted.',
      ),
    ).toBeTruthy()
    expect(deleteMock).toHaveBeenCalledWith(
      '/functions/v1/catalog/faculty/{id}',
      { params: { path: { id: 'faculty-1' } } },
    )
  })

  it('deletes an unreferenced faculty through the catalog operation', async () => {
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Faculty of Computing' }),
    )
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete faculty',
      }),
    )

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/faculty/{id}',
        { params: { path: { id: 'faculty-1' } } },
      )
      expect(getMock.mock.calls.length).toBeGreaterThan(2)
    })
  })

  it('explains department deletion conflicts and does not cascade', async () => {
    deleteMock.mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: 'DEPENDENT_RECORDS_EXIST',
        message: 'Conflict',
        details: null,
        hint: null,
        retryAfterSeconds: null,
        isAuthError: false,
        isForbidden: false,
        isNotFound: false,
        isConflict: true,
        isRateLimited: false,
        isNetworkError: false,
      }),
    )
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Computer Science' }),
    )
    expect(await screen.findByText(/currently under Faculty of Computing/)).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete department',
      }),
    )

    expect(
      await screen.findByText(
        'This department cannot be deleted while programs, courses, role assignments, or student records still reference it. No related records were deleted.',
      ),
    ).toBeTruthy()
    expect(deleteMock).toHaveBeenCalledWith(
      '/functions/v1/catalog/department/{id}',
      { params: { path: { id: 'department-1' } } },
    )
  })

  it('deletes an unreferenced department through the catalog operation', async () => {
    render(<AdminFacultiesPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Computer Science' }),
    )
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete department',
      }),
    )

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/department/{id}',
        { params: { path: { id: 'department-1' } } },
      )
      expect(getMock.mock.calls.length).toBeGreaterThan(2)
    })
  })
})
