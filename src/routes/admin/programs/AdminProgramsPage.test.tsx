import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiClientError } from '@/lib/api'
import AdminProgramsPage from './AdminProgramsPage'

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
    unwrapApiResult: (result: { data: unknown; error?: unknown }) => {
      if (result.error) throw result.error
      return result.data
    },
  }
})

const program = {
  id: 'program-1',
  code: 'BSCS',
  name: 'Computer Science',
  nominal_duration: 4,
  status: 'active',
  department_id: 'department-1',
} as const

const departments = [
  { id: 'department-1', name: 'Computer Science', faculty_id: 'faculty-1' },
]
const faculties = [{ id: 'faculty-1', name: 'Faculty of Computing' }]

function result(
  data: unknown,
  contentRange = '0-0/1',
) {
  return {
    data,
    error: undefined,
    response: new Response(null, {
      headers: { 'Content-Range': contentRange },
    }),
  }
}

function programCalls() {
  return getMock.mock.calls.filter(
    ([path]: [string]) => path === '/rest/v1/program',
  )
}

describe('AdminProgramsPage', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    getMock.mockReset()
    postMock.mockReset()
    patchMock.mockReset()
    deleteMock.mockReset()
    getMock.mockImplementation((path: string, options?: { params?: { query?: { offset?: number } } }) => {
      if (path === '/rest/v1/program') {
        const offset = options?.params?.query?.offset ?? 0
        const programs = offset === 0 ? [program] : []
        const range = programs.length
          ? `${offset}-${offset + programs.length - 1}/1`
          : '*/1'
        return Promise.resolve(result(programs, range))
      }
      if (path === '/rest/v1/department') {
        return Promise.resolve(result(departments))
      }
      return Promise.resolve(result(faculties))
    })
    postMock.mockResolvedValue(result(program))
    patchMock.mockResolvedValue(result(program))
    deleteMock.mockResolvedValue(result(null, '*/0'))
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('loads a bounded projection and displays the faculty from the program department', async () => {
    render(<AdminProgramsPage />)

    expect(await screen.findByText('Computer Science')).toBeTruthy()
    expect(screen.getByText('Faculty of Computing')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(programCalls()[0]?.[1]).toEqual(
      expect.objectContaining({
        params: {
          query: {
            select: 'id,code,name,nominal_duration,status,department_id',
            order: 'name.asc,id.asc',
            limit: 20,
            offset: 0,
          },
        },
      }),
    )
  })

  it('surfaces catalog request errors and retries the failed request', async () => {
    let failFirstRequest = true
    getMock.mockImplementation((path: string) => {
      if (path === '/rest/v1/program' && failFirstRequest) {
        failFirstRequest = false
        return Promise.reject(new Error('Program catalog unavailable'))
      }
      return Promise.resolve(
        result(
          path === '/rest/v1/program'
            ? [program]
            : path === '/rest/v1/department'
              ? departments
              : faculties,
        ),
      )
    })
    render(<AdminProgramsPage />)

    expect(
      (await screen.findByRole('alert')).textContent,
    ).toContain('Program catalog unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Computer Science')).toBeTruthy()
  })

  it('submits search and lifecycle filters and uses server pagination', async () => {
    const pagePrograms = Array.from({ length: 20 }, (_, index) => ({
      ...program,
      id: `program-${index}`,
    }))
    getMock.mockImplementation((path: string, options?: { params?: { query?: { offset?: number } } }) => {
      if (path === '/rest/v1/program') {
        const offset = options?.params?.query?.offset ?? 0
        const rows = offset === 0 ? pagePrograms : [program]
        return Promise.resolve(
          result(rows, `${offset}-${offset + rows.length - 1}/21`),
        )
      }
      return Promise.resolve(
        result(path === '/rest/v1/department' ? departments : faculties),
      )
    })
    render(<AdminProgramsPage />)
    await screen.findAllByText('Faculty of Computing')

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search programs' }), {
      target: { value: 'computer' },
    })
    await waitFor(() => {
      expect(programCalls().at(-1)?.[1]).toEqual(
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              or: '(code.ilike.%computer%,name.ilike.%computer%)',
              offset: 0,
            }),
          },
        }),
      )
    })

    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Inactive' }))
    await waitFor(() => {
      expect(programCalls().at(-1)?.[1]).toEqual(
        expect.objectContaining({
          params: {
            query: expect.objectContaining({
              status: 'eq.inactive',
              offset: 0,
            }),
          },
        }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(programCalls().at(-1)?.[1]).toEqual(
        expect.objectContaining({
          params: {
            query: expect.objectContaining({ offset: 20 }),
          },
        }),
      )
    })
  })

  it('validates the form and creates programs through the catalog operation', async () => {
    render(<AdminProgramsPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Add program' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Add program' }))
    expect(await screen.findByText('Enter a program code between 2 and 250 characters.')).toBeTruthy()
    expect(postMock).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Program code'), {
      target: { value: 'BSIT' },
    })
    fireEvent.change(screen.getByLabelText('Program name'), {
      target: { value: 'Information Technology' },
    })
    fireEvent.change(screen.getByLabelText('Duration in years'), {
      target: { value: '4' },
    })
    fireEvent.click(screen.getByRole('combobox', { name: 'Faculty' }))
    fireEvent.click(
      await screen.findByRole('option', { name: 'Faculty of Computing' }),
    )
    fireEvent.click(screen.getByRole('combobox', { name: 'Department' }))
    fireEvent.click(
      await screen.findByRole('option', { name: 'Computer Science' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add program' }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/program',
        {
          body: {
            code: 'BSIT',
            name: 'Information Technology',
            nominal_duration: 4,
            status: 'active',
            department_id: 'department-1',
          },
        },
      )
    })
  })

  it('updates programs through the catalog operation', async () => {
    render(<AdminProgramsPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Computer Science' }))
    fireEvent.change(screen.getByLabelText('Program name'), {
      target: { value: 'Computer Science and Technology' },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/program/{id}',
        expect.objectContaining({
          params: { path: { id: 'program-1' } },
          body: expect.objectContaining({
            name: 'Computer Science and Technology',
            department_id: 'department-1',
          }),
        }),
      )
    })
  })

  it('explains dependency conflicts when deletion is rejected', async () => {
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
    render(<AdminProgramsPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Computer Science' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete program' }))

    expect(
      await screen.findByText(
        'This program cannot be deleted while curriculum versions, student assignments, or historical records still reference it.',
      ),
    ).toBeTruthy()
    expect(deleteMock).toHaveBeenCalledWith(
      '/functions/v1/catalog/program/{id}',
      { params: { path: { id: 'program-1' } } },
    )
  })

  it('deletes an unreferenced program and refreshes the catalog', async () => {
    render(<AdminProgramsPage />)
    await screen.findByText('Computer Science')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Computer Science' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete program' }))

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(
        '/functions/v1/catalog/program/{id}',
        { params: { path: { id: 'program-1' } } },
      )
      expect(programCalls().length).toBeGreaterThan(1)
    })
  })
})
