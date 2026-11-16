import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { StaffScopeContext } from '../shared/use-staff-scope'
import type { ReactNode } from 'react'
import DepartmentStaffPortal from '../DepartmentStaffPortal'
import { listCurricula, readCurriculum, type CurriculumVersion } from './curricula.api'

vi.mock('./curricula.api', () => ({ listCurricula: vi.fn(), readCurriculum: vi.fn(), createCurriculumVersion: vi.fn(), updateCurriculumVersion: vi.fn(), deleteCurriculumVersion: vi.fn() }))
vi.mock('../shared/staff-scope-provider', () => ({ StaffScopeProvider: ({ children }: { children: ReactNode }) => children }))
const version: CurriculumVersion = { id: 'v1', program_id: 'p1', version_label: '2024', effective_start: '2024-08-01', total_units: 0, delinquency_threshold: 0, status: 'active', enrolled_student_count: 0 }
const catalog = { programs: [{ id: 'p1', code: 'BSCS', name: 'Computer Science', department_id: 'd1', nominal_duration: 4, status: 'active' as const }], versions: [version, { ...version, id: 'v2', version_label: '2020', status: 'teach_out' as const, enrolled_student_count: undefined }] }
const detail = {
  terms: [{ id: 't1', curriculum_version_id: 'v1', year_level: 1, term_sequence: 1 }],
  slots: [
    { id: 's1', curriculum_term_id: 't1', course_id: 'c1', is_elective_slot: false, nominal_units: 3 },
    { id: 's2', curriculum_term_id: 't1', is_elective_slot: true, slot_type: 'elective' as const, slot_label: 'Free elective', nominal_units: 0 },
    { id: 's3', curriculum_term_id: 't1', slot_type: 'ge' as const, is_elective_slot: false, nominal_units: 3 },
    { id: 's4', curriculum_term_id: 't1', course_id: 'missing', is_elective_slot: false, nominal_units: 3 },
  ],
  courses: [{ id: 'c1', department_id: 'd1', code: 'CS 101', title: 'Computing', units: 4, status: 'active' as const, repeatable_type: 'none' as const }],
}
function mount(ready = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const scope = ready
    ? { status: 'ready' as const, departmentIds: ['d1'], selectedDepartmentId: 'd1', departmentId: 'd1', profileId: 'u1', canQuery: true as const, selectDepartment: vi.fn() }
    : { status: 'loading' as const, departmentIds: [], selectedDepartmentId: null, canQuery: false as const, selectDepartment: vi.fn() }
  const result = render(<QueryClientProvider client={queryClient}><StaffScopeContext.Provider value={scope}><MemoryRouter initialEntries={['/department-staff/curricula']}><Routes><Route path="/department-staff/*" element={<DepartmentStaffPortal />} /></Routes></MemoryRouter></StaffScopeContext.Provider></QueryClientProvider>)
  return { ...result, queryClient }
}
beforeEach(() => { vi.mocked(listCurricula).mockResolvedValue(catalog); vi.mocked(readCurriculum).mockResolvedValue(detail) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('Curriculum overview', () => {
  it('loads by department and preserves zero counts, flexible slots and missing references', async () => {
    const { queryClient } = mount()
    await screen.findByText('CS 101 - Computing', {}, { timeout: 5000 })
    expect(listCurricula).toHaveBeenCalledWith('d1', expect.any(AbortSignal))
    expect(screen.getByText('0 assigned students')).toBeTruthy()
    expect(screen.getByText('Free elective')).toBeTruthy()
    expect(screen.getByText('GE slot')).toBeTruthy()
    expect(screen.getByText('Course reference unavailable')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull()
    expect(queryClient.getQueryCache().getAll().every(query => query.queryKey[1] === 'u1' && query.queryKey[2] === 'd1')).toBe(true)
  })
  it('changes version without showing previous requirements and retains selection after refetch', async () => {
    vi.mocked(readCurriculum).mockImplementation(async id => id === 'v1' ? detail : { terms: [], slots: [], courses: [] })
    const { queryClient } = mount()
    await screen.findByText('CS 101 - Computing')
    fireEvent.change(screen.getByLabelText('Curriculum version'), { target: { value: 'v2' } })
    await screen.findByText('No terms are available for this curriculum version.')
    expect(screen.queryByText('CS 101 - Computing')).toBeNull()
    expect(screen.getByText('Assigned student count unavailable')).toBeTruthy()
    expect(screen.getByText('Teach out')).toBeTruthy()
    await queryClient.invalidateQueries({ queryKey: ['staff', 'u1', 'd1', 'curricula'] })
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe('v2')
  })
  it('handles no versions without making a detail request', async () => {
    vi.mocked(listCurricula).mockResolvedValue({ programs: [], versions: [] })
    mount()
    await screen.findByText('No curriculum versions are available for your department.')
    expect(readCurriculum).not.toHaveBeenCalled()
  })
  it('shows failed requirements with retry rather than an empty checklist', async () => {
    vi.mocked(readCurriculum).mockRejectedValueOnce(new Error('Requirements unavailable'))
    mount()
    await screen.findByRole('alert')
    expect(screen.queryByText('No terms are available for this curriculum version.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry requirements' }))
    await screen.findByText('CS 101 - Computing')
  })
  it('makes no requests before scope is ready', async () => {
    mount(false)
    await waitFor(() => expect(screen.getByText(/Loading your authorized department scope/)).toBeTruthy())
    expect(listCurricula).not.toHaveBeenCalled()
    expect(readCurriculum).not.toHaveBeenCalled()
  })
})
