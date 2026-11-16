import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import type { AcademicTermsData } from './academic-terms.api'
import AcademicTermsPage from './AcademicTermsPage'

const { useAcademicTerms, createMutation, updateMutation } = vi.hoisted(() => ({
  useAcademicTerms: vi.fn(),
  createMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
  updateMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
}))

vi.mock('@/hooks/use-academic-terms', () => ({
  useAcademicTerms: () => useAcademicTerms(),
  useCreateSchoolTerm: () => createMutation,
  useUpdateSchoolTerm: () => updateMutation,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const lockedTerm: AcademicTermsData['terms'][number] = {
  id: 'term-1',
  start_year: 2025,
  end_year: 2026,
  term_type: '2nd Semester',
  school_year: '2025 - 2026',
  is_locked: true,
  override_flag: true,
  override_at: '2026-07-01T00:00:00Z',
  starts_on: '2026-01-15',
  ends_on: '2026-05-30',
  encoding_deadline: '2026-06-15',
  closed_by_name: 'Institution Admin',
  closed_at: '2026-06-16T00:00:00Z',
  default_inc_deadline: '2027-05-30',
  chronological_key: 20252,
}

function success(data: AcademicTermsData): Partial<UseQueryResult<AcademicTermsData>> {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    refetch: vi.fn(),
  }
}

describe('AcademicTermsPage', () => {
  it('opens create and edit forms from the terms page', () => {
    useAcademicTerms.mockReturnValue(
      success({ terms: [lockedTerm], departmentClosures: [] }),
    )

    render(<AcademicTermsPage />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit 2025 - 2026 2nd Semester academic term',
      }),
    )
    expect(screen.getByRole('dialog', { name: 'Edit academic term' })).toBeTruthy()
    expect(
      (screen.getByLabelText('Actual end date') as HTMLInputElement).value,
    ).toBe('2026-05-30')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add academic term' }))
    expect(screen.getByRole('dialog', { name: 'Create academic term' })).toBeTruthy()
  })

  it('shows institutional lock separately from this department closure and exposes read-only details', async () => {
    useAcademicTerms.mockReturnValue(
      success({
        terms: [lockedTerm],
        departmentClosures: [
          {
            id: 'closure-1',
            school_term_id: 'term-1',
            department_id: 'department-1',
            is_closed: false,
            closed_by_name: null,
            closed_at: null,
          },
        ],
      }),
    )

    render(<AcademicTermsPage />)

    expect(screen.getAllByText('Locked')).toHaveLength(2)
    expect(screen.getAllByText('Open')).toHaveLength(2)
    expect(screen.getAllByText('15 Jun 2026')).toHaveLength(2)
    const summary = screen.getByText('View term')
    expect(summary.tagName).toBe('SUMMARY')
    expect(summary.getAttribute('aria-label')).toBe(
      'View details for 2025 - 2026, 2nd Semester',
    )
    expect(screen.queryByText('Institutional override')).toBeNull()

    fireEvent.click(summary)

    expect(screen.getAllByText('Institution-wide lock')).toHaveLength(2)
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent?.includes('Recorded by Institution Admin on') === true,
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /close encoding/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /add a term/i })).toBeNull()
  })

  it('shows department closure actor and time in read-only term details', () => {
    useAcademicTerms.mockReturnValue(
      success({
        terms: [lockedTerm],
        departmentClosures: [
          {
            id: 'closure-1',
            school_term_id: 'term-1',
            department_id: 'department-1',
            is_closed: true,
            closed_by_name: 'Department Staff',
            closed_at: '2026-06-17T00:00:00Z',
          },
        ],
      }),
    )

    render(<AcademicTermsPage />)

    expect(screen.getAllByText('Closed')).toHaveLength(2)
    fireEvent.click(screen.getByText('View term'))
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'P' &&
          element.textContent?.includes('Recorded by Department Staff on') === true,
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /reopen encoding/i })).toBeNull()
  })

  it('does not infer an open state when no department closure record exists', () => {
    useAcademicTerms.mockReturnValue(
      success({ terms: [lockedTerm], departmentClosures: [] }),
    )

    render(<AcademicTermsPage />)

    expect(screen.getAllByText('No department-specific record')).toHaveLength(2)
    expect(screen.queryByText('Open')).toBeNull()
  })

  it('shows an explicit empty state when the service returns no terms', () => {
    useAcademicTerms.mockReturnValue(success({ terms: [], departmentClosures: [] }))

    render(<AcademicTermsPage />)

    expect(screen.getByText('No academic terms are available.')).toBeTruthy()
  })

  it('shows a denied read error and offers a retry instead of an empty state', () => {
    const refetch = vi.fn()
    useAcademicTerms.mockReturnValue({
      isPending: false,
      isError: true,
      isSuccess: false,
      isFetching: false,
      error: new ApiClientError(
        normalizeApiError(
          { message: 'Forbidden' },
          new Response(null, { status: 403 }),
        ),
      ),
      refetch,
    } satisfies Partial<UseQueryResult<AcademicTermsData>>)

    render(<AcademicTermsPage />)

    expect(screen.getByRole('alert').textContent).toContain(
      'not permitted to view academic terms',
    )
    expect(screen.queryByText('No academic terms are available.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
