import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import { staffQueryKeys } from '../shared/staff-query-keys'
import { StaffScopeContext } from '../shared/use-staff-scope'
import type { AcademicTermsData, SchoolTerm } from './academic-terms.api'
import { SchoolTermDialog } from './SchoolTermDialog'

const api = vi.hoisted(() => ({
  listAcademicTerms: vi.fn(),
  createSchoolTerm: vi.fn(),
  updateSchoolTerm: vi.fn(),
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

const originalTerm: SchoolTerm = {
  id: 'term-existing',
  start_year: 2026,
  end_year: 2027,
  term_type: '1st Semester',
  school_year: '2026 - 2027',
  is_locked: true,
  override_flag: false,
  starts_on: '2026-08-01',
  ends_on: '2026-12-20',
  encoding_deadline: '2027-01-15',
  closed_by_name: 'Institution Admin',
  closed_at: '2027-01-16T00:00:00Z',
  default_inc_deadline: '2027-12-20',
  chronological_key: 20261,
}

const emptyTerms: AcademicTermsData = {
  terms: [],
  departmentClosures: [],
}

function renderDialog(term?: SchoolTerm) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  if (term) {
    queryClient.setQueryData(
      staffQueryKeys.resource('staff', 'department', 'academic-terms'),
      { terms: [term], departmentClosures: [] },
    )
  }
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <StaffScopeContext.Provider value={scope}>
        <SchoolTermDialog term={term} onClose={onClose} onSaved={onSaved} />
      </StaffScopeContext.Provider>
    </QueryClientProvider>,
  )
  return { queryClient, onClose, onSaved }
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Starting academic year'), {
    target: { value: '2026' },
  })
  fireEvent.change(screen.getByLabelText('Ending academic year'), {
    target: { value: '2027' },
  })
  fireEvent.change(screen.getByLabelText('Term type'), {
    target: { value: 'Summer' },
  })
  fireEvent.change(screen.getByLabelText('Start date'), {
    target: { value: '2026-06-01' },
  })
  fireEvent.change(screen.getByLabelText('Actual end date'), {
    target: { value: '2026-08-15' },
  })
  fireEvent.change(screen.getByLabelText('Encoding deadline'), {
    target: { value: '2026-08-31' },
  })
}

function apiError(status: number, message: string): ApiClientError {
  return new ApiClientError(
    normalizeApiError({ message }, new Response(null, { status })),
  )
}

beforeEach(() => {
  api.listAcademicTerms.mockResolvedValue(emptyTerms)
  api.createSchoolTerm.mockReset()
  api.updateSchoolTerm.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SchoolTermDialog', () => {
  it('creates a term and maps Summer/Midyear to the contract enum', async () => {
    api.createSchoolTerm.mockResolvedValue({
      ...originalTerm,
      id: 'term-created',
      term_type: 'Summer',
      starts_on: '2026-06-01',
      ends_on: '2026-08-15',
      encoding_deadline: '2026-08-31',
      is_locked: false,
    })
    const { onSaved } = renderDialog()

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create term' }))

    await waitFor(() => expect(api.createSchoolTerm).toHaveBeenCalledOnce())
    expect(api.createSchoolTerm).toHaveBeenCalledWith({
      start_year: 2026,
      end_year: 2027,
      term_type: 'Summer',
      starts_on: '2026-06-01',
      ends_on: '2026-08-15',
      encoding_deadline: '2026-08-31',
      is_locked: false,
    })
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('does not submit missing or out-of-order dates and academic years', async () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Create term' }))
    expect(await screen.findByText('Enter a valid start date.')).toBeTruthy()
    expect(api.createSchoolTerm).not.toHaveBeenCalled()

    fillValidForm()
    fireEvent.change(screen.getByLabelText('Ending academic year'), {
      target: { value: '2028' },
    })
    fireEvent.change(screen.getByLabelText('Actual end date'), {
      target: { value: '2026-05-31' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create term' }))

    expect(
      await screen.findByText('The ending year must be one year after the starting year.'),
    ).toBeTruthy()
    expect(
      screen.getByText('The actual end date cannot precede the start date.'),
    ).toBeTruthy()
    expect(api.createSchoolTerm).not.toHaveBeenCalled()
  })

  it('requires the encoding deadline to be on or after the actual end date', async () => {
    renderDialog()
    fillValidForm()
    fireEvent.change(screen.getByLabelText('Encoding deadline'), {
      target: { value: '2026-08-14' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create term' }))

    expect(
      await screen.findByText(
        'The encoding deadline cannot precede the actual end date.',
      ),
    ).toBeTruthy()
    expect(api.createSchoolTerm).not.toHaveBeenCalled()
  })

  it.each([
    [409, 'The term could not be created because of a conflict. Duplicate term.'],
    [403, 'Your account is not permitted to manage school terms for this department.'],
  ])('preserves form values after a %i response', async (status, message) => {
    api.createSchoolTerm.mockRejectedValue(
      apiError(status, status === 409 ? 'Duplicate term.' : 'Denied.'),
    )
    renderDialog()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create term' }))

    expect((await screen.findByRole('alert')).textContent).toContain(message)
    expect((screen.getByLabelText('Starting academic year') as HTMLInputElement).value).toBe('2026')
    expect((screen.getByLabelText('Term type') as HTMLSelectElement).value).toBe('Summer')
    expect(api.createSchoolTerm).toHaveBeenCalledOnce()
  })

  it('updates the selected term without exposing lock or server closure metadata', async () => {
    api.updateSchoolTerm.mockResolvedValue({
      ...originalTerm,
      term_type: 'Summer',
      starts_on: '2026-06-01',
      ends_on: '2026-08-15',
      encoding_deadline: '2026-08-31',
    })
    const { onSaved } = renderDialog(originalTerm)

    fireEvent.change(screen.getByLabelText('Term type'), {
      target: { value: 'Summer' },
    })
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-06-01' },
    })
    fireEvent.change(screen.getByLabelText('Actual end date'), {
      target: { value: '2026-08-15' },
    })
    fireEvent.change(screen.getByLabelText('Encoding deadline'), {
      target: { value: '2026-08-31' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(api.updateSchoolTerm).toHaveBeenCalledOnce())
    expect(api.updateSchoolTerm).toHaveBeenCalledWith('term-existing', {
      start_year: 2026,
      end_year: 2027,
      term_type: 'Summer',
      starts_on: '2026-06-01',
      ends_on: '2026-08-15',
      encoding_deadline: '2026-08-31',
    })
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('does not issue writes on cancel and prevents duplicate pending submissions', async () => {
    const { onClose, onSaved } = renderDialog()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(api.createSchoolTerm).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()

    cleanup()
    let finish!: (term: SchoolTerm) => void
    api.createSchoolTerm.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const pending = renderDialog()
    fillValidForm()
    const submit = screen.getByRole('button', { name: 'Create term' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(await screen.findByRole('button', { name: 'Creating term…' })).toBeTruthy()
    expect(api.createSchoolTerm).toHaveBeenCalledOnce()

    await act(async () => finish({ ...originalTerm, is_locked: false, term_type: 'Summer', starts_on: '2026-06-01', ends_on: '2026-08-15', encoding_deadline: '2026-08-31' }))
    await waitFor(() => expect(pending.onSaved).toHaveBeenCalledOnce())
  })
})
