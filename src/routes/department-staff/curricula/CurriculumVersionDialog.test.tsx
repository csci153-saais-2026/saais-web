import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StaffScopeContext } from '../shared/use-staff-scope'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import CurriculaPage from './CurriculaPage'
import { createCurriculumVersion, listCurricula, readCurriculum, type CurriculumVersion } from './curricula.api'
import { blankVersionRequest, curriculumVersionSchema, type CurriculumVersionValues } from './curriculum-version.schema'

vi.mock('./curricula.api', () => ({ listCurricula: vi.fn(), readCurriculum: vi.fn(), createCurriculumVersion: vi.fn() }))
const programId = '11111111-1111-4111-8111-111111111111'
const scope = { status: 'ready' as const, departmentIds: ['department'], selectedDepartmentId: 'department', departmentId: 'department', profileId: 'staff', canQuery: true as const, selectDepartment: vi.fn() }
const program = { id: programId, code: 'BSCS', name: 'Computer Science', department_id: 'department', nominal_duration: 4, status: 'active' as const }
const values: CurriculumVersionValues = { program_id: programId, version_label: '2027', effective_start: '2027-08-01', effective_end: '', total_units: 0, delinquency_threshold: 0, status: 'draft' }
const saved: CurriculumVersion = { ...values, id: 'new-version', effective_end: null, enrolled_student_count: 0 }

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><StaffScopeContext.Provider value={scope}><CurriculaPage /></StaffScopeContext.Provider></QueryClientProvider>)
  return client
}
async function openForm() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'Add version' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
  await screen.findByRole('dialog', { name: 'Create curriculum version' })
}
function fillForm() {
  fireEvent.change(screen.getByLabelText('Program'), { target: { value: programId } })
  fireEvent.change(screen.getByLabelText('Version label'), { target: { value: '  2027  ' } })
  fireEvent.change(screen.getByLabelText('Effective start'), { target: { value: '2027-08-01' } })
}
beforeEach(() => {
  vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [] })
  vi.mocked(readCurriculum).mockResolvedValue({ terms: [], slots: [], courses: [] })
  vi.mocked(createCurriculumVersion).mockResolvedValue(saved)
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('Blank version input validation', () => {
  it('preserves zero and quarter units, trims labels, and normalizes optional end date', () => {
    expect(blankVersionRequest({ ...values, version_label: '  2027  ', total_units: 162.25 })).toEqual({ ...values, version_label: '2027', total_units: 162.25, effective_end: null })
  })
  it.each([
    { version_label: ' ' }, { version_label: 'x'.repeat(101) }, { program_id: 'bad-id' },
    { effective_start: '2027-02-30' }, { effective_end: '2027-07-31' },
    { total_units: -1 }, { total_units: 1.1 }, { total_units: NaN },
    { delinquency_threshold: -0.25 }, { status: 'invented' }, { clone_from_version_id: programId },
  ])('rejects invalid or unsupported creation fields: %j', fields => {
    expect(curriculumVersionSchema.safeParse({ ...values, ...fields }).success).toBe(false)
  })
})

describe('Create curriculum version', () => {
  it('creates the first blank version, refreshes options and selects the returned version', async () => {
    const client = mount()
    await openForm()
    fillForm()
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [saved] })
    fireEvent.click(screen.getByRole('button', { name: 'Create version' }))
    await screen.findByText('Curriculum version created.')
    expect(createCurriculumVersion).toHaveBeenCalledExactlyOnceWith({ ...values, effective_end: null })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe(saved.id)
    expect(screen.getByText('0 assigned students')).toBeTruthy()
    expect(vi.mocked(listCurricula).mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(client.getMutationCache().getAll()[0].options.retry).toBe(false)
  })
  it('does not write on cancel or invalid input', async () => {
    mount()
    await openForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create version' }))
    await screen.findByText('Enter a version label.')
    expect(createCurriculumVersion).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it.each([403, 409, 429, 500])('retains form inputs after a %i server denial without automatic retry', async status => {
    vi.mocked(createCurriculumVersion).mockRejectedValue(new ApiClientError(normalizeApiError({ message: 'Creation rejected' }, new Response(null, { status }))))
    mount()
    await openForm()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create version' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Version label') as HTMLInputElement).value).toBe('  2027  ')
    expect((screen.getByRole('button', { name: 'Create version' }) as HTMLButtonElement).disabled).toBe(false)
    expect(createCurriculumVersion).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Curriculum version created.')).toBeNull()
  })
  it('prevents duplicate requests while creation is pending', async () => {
    let finish!: (version: CurriculumVersion) => void
    vi.mocked(createCurriculumVersion).mockReturnValue(new Promise(resolve => { finish = resolve }))
    mount()
    await openForm()
    fillForm()
    const submit = screen.getByRole('button', { name: 'Create version' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    await screen.findByRole('button', { name: 'Creating version...' })
    expect(createCurriculumVersion).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [saved] })
    await act(async () => finish(saved))
    await screen.findByText('Curriculum version created.')
  })
  it('rechecks that a program remains in the current department before posting', async () => {
    const client = mount()
    await openForm()
    fillForm()
    act(() => client.setQueryData(['staff', 'staff', 'department', 'curricula', {}], { programs: [], versions: [] }))
    fireEvent.click(screen.getByRole('button', { name: 'Create version' }))
    await screen.findByText('Select a program in your authorized department and retry.')
    expect(createCurriculumVersion).not.toHaveBeenCalled()
  })
})
