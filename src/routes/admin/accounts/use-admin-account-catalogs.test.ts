import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminAccountCatalogs } from './use-admin-account-catalogs'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', () => ({
  apiClient: { GET: getMock },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}))

describe('useAdminAccountCatalogs', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads faculty and department choices with bounded projections', async () => {
    const faculties = [{ id: 'faculty-1', name: 'Faculty of Computing' }]
    const departments = [
      {
        id: 'department-1',
        name: 'Computer Science',
        faculty_id: 'faculty-1',
      },
    ]
    const programs = [
      {
        id: 'program-1',
        code: 'BSCS',
        name: 'Computer Science',
        department_id: 'department-1',
        status: 'active',
      },
    ]
    const dataByPath: Record<string, unknown> = {
      '/rest/v1/faculty': faculties,
      '/rest/v1/department': departments,
      '/rest/v1/program': programs,
    }
    getMock.mockImplementation((path: string) =>
      Promise.resolve({
        data: dataByPath[path] ?? [],
        response: new Response(),
      }),
    )

    const { result } = renderHook(() => useAdminAccountCatalogs())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.faculties).toEqual(faculties)
    expect(result.current.departments).toEqual(departments)
    expect(result.current.programs).toEqual(programs)
    expect(getMock).toHaveBeenCalledTimes(5)
    expect(getMock).toHaveBeenCalledWith(
      '/rest/v1/department',
      expect.objectContaining({
        params: {
          query: {
            select: 'id,name,faculty_id',
            order: 'name.asc',
            limit: 1000,
          },
        },
      }),
    )
    expect(getMock).toHaveBeenCalledWith(
      '/rest/v1/program',
      expect.objectContaining({
        params: {
          query: {
            select: 'id,code,name,department_id,status',
            order: 'name.asc',
            limit: 1000,
          },
        },
      }),
    )
    expect(getMock).toHaveBeenCalledWith(
      '/functions/v1/accounts',
      expect.objectContaining({
        params: {
          query: { role: 'adviser', limit: 1000, offset: 0 },
        },
      }),
    )
  })

  it('surfaces catalog load failures', async () => {
    getMock.mockRejectedValue(new Error('Catalog unavailable'))
    const { result } = renderHook(() => useAdminAccountCatalogs())

    await waitFor(() =>
      expect(result.current.error).toBe('Catalog unavailable'),
    )
  })
})
