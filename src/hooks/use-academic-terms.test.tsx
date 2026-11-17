import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { StaffScopeContext } from '@/routes/department-staff/shared/use-staff-scope'
import type { AcademicTermsData, SchoolTerm } from '@/routes/department-staff/academic-terms/academic-terms.api'
import type { SchoolTermFormValues } from '@/routes/department-staff/academic-terms/school-term.schema'
import {
  useAcademicTerms,
  useCloseAcademicTermEncoding,
  useCreateSchoolTerm,
  useReopenAcademicTermEncoding,
  useUpdateSchoolTerm,
} from './use-academic-terms'

const api = vi.hoisted(() => ({
  listAcademicTerms: vi.fn(),
  createSchoolTerm: vi.fn(),
  updateSchoolTerm: vi.fn(),
  closeSchoolTermEncoding: vi.fn(),
  reopenDepartmentTermEncoding: vi.fn(),
}))

vi.mock('@/routes/department-staff/academic-terms/academic-terms.api', () => api)

const scope = {
  status: 'ready' as const,
  departmentIds: ['department'],
  selectedDepartmentId: 'department',
  departmentId: 'department',
  profileId: 'staff',
  canQuery: true as const,
  selectDepartment: vi.fn(),
}

const original: SchoolTerm = {
  id: 'term-existing',
  start_year: 2026,
  end_year: 2027,
  term_type: '1st Semester',
  school_year: '2026 - 2027',
  is_locked: false,
  override_flag: false,
  starts_on: '2026-08-01',
  ends_on: '2026-12-20',
  encoding_deadline: '2027-01-15',
  default_inc_deadline: '2027-12-20',
  chronological_key: 20261,
}

const values: SchoolTermFormValues = {
  start_year: 2026,
  end_year: 2027,
  term_type: 'Summer',
  starts_on: '2026-06-01',
  ends_on: '2026-08-15',
  encoding_deadline: '2026-08-31',
}

const initialData: AcademicTermsData = {
  terms: [original],
  departmentClosures: [],
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <StaffScopeContext.Provider value={scope}>
        {children}
      </StaffScopeContext.Provider>
    </QueryClientProvider>
  )
  const queryKey = staffQueryKeys.resource(
    'staff',
    'department',
    'academic-terms',
  )
  const hook = renderHook(
    () => ({
      terms: useAcademicTerms(),
      create: useCreateSchoolTerm(),
      update: useUpdateSchoolTerm(),
      close: useCloseAcademicTermEncoding(),
      reopen: useReopenAcademicTermEncoding(),
    }),
    { wrapper },
  )
  return { ...hook, queryClient, queryKey }
}

beforeEach(() => {
  api.listAcademicTerms.mockReset().mockResolvedValue(initialData)
  api.createSchoolTerm.mockReset()
  api.updateSchoolTerm.mockReset()
  api.closeSchoolTermEncoding.mockReset()
  api.reopenDepartmentTermEncoding.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Academic term mutations', () => {
  it('reopens department encoding and preserves an institution-wide lock from refreshed data', async () => {
    const institutionallyLockedTerm = { ...original, is_locked: true }
    const closedClosure = {
      id: 'closure-1',
      school_term_id: original.id,
      department_id: scope.departmentId,
      is_closed: true,
    }
    const reopenedClosure = { ...closedClosure, is_closed: false }
    api.listAcademicTerms
      .mockReset()
      .mockResolvedValueOnce({
        terms: [institutionallyLockedTerm],
        departmentClosures: [closedClosure],
      })
      .mockResolvedValue({
        terms: [institutionallyLockedTerm],
        departmentClosures: [reopenedClosure],
      })
    api.reopenDepartmentTermEncoding.mockResolvedValue(reopenedClosure)
    const { result } = setup()

    await waitFor(() => expect(result.current.terms.isSuccess).toBe(true))
    await act(async () =>
      result.current.reopen.mutateAsync({ term: institutionallyLockedTerm }),
    )

    expect(api.reopenDepartmentTermEncoding).toHaveBeenCalledWith(
      original.id,
      {
        scope: 'department',
        department_id: scope.departmentId,
      },
    )
    expect(api.reopenDepartmentTermEncoding.mock.calls[0]?.[1]).not.toMatchObject({
      scope: 'institution',
    })
    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledTimes(2))
    expect(result.current.terms.data?.terms[0]?.is_locked).toBe(true)
    expect(result.current.terms.data?.departmentClosures[0]?.is_closed).toBe(false)
  })

  it('closes encoding only for the resolved department and refreshes term metadata', async () => {
    api.closeSchoolTermEncoding.mockResolvedValue(original)
    const { result } = setup()

    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledOnce())
    await act(async () =>
      result.current.close.mutateAsync({
        term: original,
        closureNote: 'Grade review complete.',
      }),
    )

    expect(api.closeSchoolTermEncoding).toHaveBeenCalledWith(
      original.id,
      {
        scope: 'department',
        department_id: 'department',
        closure_note: 'Grade review complete.',
      },
    )
    expect(api.closeSchoolTermEncoding.mock.calls[0]?.[1]).not.toMatchObject({
      scope: 'institution',
    })
    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledTimes(2))
  })

  it('does not close a department term that is already closed in the cache', async () => {
    api.listAcademicTerms.mockResolvedValue({
      ...initialData,
      departmentClosures: [
        {
          id: 'closure-1',
          school_term_id: original.id,
          department_id: scope.departmentId,
          is_closed: true,
        },
      ],
    })
    const { result } = setup()

    await waitFor(() => expect(result.current.terms.isSuccess).toBe(true))
    await expect(
      result.current.close.mutateAsync({
        term: original,
        closureNote: null,
      }),
    ).rejects.toThrow('already closed')
    expect(api.closeSchoolTermEncoding).not.toHaveBeenCalled()
  })

  it('refreshes the scoped term list after creation', async () => {
    api.createSchoolTerm.mockResolvedValue({
      ...original,
      id: 'term-created',
      term_type: 'Summer',
      starts_on: values.starts_on,
      ends_on: values.ends_on,
      encoding_deadline: values.encoding_deadline,
    })
    const { result } = setup()

    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledOnce())
    await act(async () => result.current.create.mutateAsync(values))

    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledTimes(2))
    expect(api.createSchoolTerm).toHaveBeenCalledWith({
      ...values,
      is_locked: false,
    })
  })

  it('refreshes terms after updating the selected record', async () => {
    const updated: SchoolTerm = {
      ...original,
      term_type: values.term_type,
      starts_on: values.starts_on,
      ends_on: values.ends_on,
      encoding_deadline: values.encoding_deadline,
    }
    api.listAcademicTerms
      .mockReset()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValue({ terms: [updated], departmentClosures: [] })
    api.updateSchoolTerm.mockResolvedValue(updated)
    const { result } = setup()

    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledOnce())
    await act(async () =>
      result.current.update.mutateAsync({ original, values }),
    )

    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledTimes(2))
    expect(api.updateSchoolTerm).toHaveBeenCalledWith('term-existing', values)
    expect(result.current.terms.data?.terms[0]?.term_type).toBe('Summer')
  })

  it('blocks an edit when the cached record changed while the form was open', async () => {
    const { result, queryClient, queryKey } = setup()
    await waitFor(() => expect(api.listAcademicTerms).toHaveBeenCalledOnce())
    queryClient.setQueryData(queryKey, {
      terms: [{ ...original, ends_on: '2027-01-01' }],
      departmentClosures: [],
    })

    await expect(
      act(async () =>
        result.current.update.mutateAsync({ original, values }),
      ),
    ).rejects.toThrow('This school term changed while the form was open.')
    expect(api.updateSchoolTerm).not.toHaveBeenCalled()
  })
})
