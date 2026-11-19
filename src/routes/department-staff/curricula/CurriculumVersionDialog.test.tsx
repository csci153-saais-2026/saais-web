import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StaffScopeContext } from '../shared/use-staff-scope'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import CurriculaPage from './CurriculaPage'
import { createCurriculumVersion, listCurricula, readCurriculum, updateCurriculumVersion, type CurriculumVersion } from './curricula.api'
import { blankVersionRequest, curriculumVersionSchema, curriculumVersionEditSchema, versionUpdateRequest, type CurriculumVersionValues } from './curriculum-version.schema'

vi.mock('./curricula.api', () => ({ listCurricula: vi.fn(), readCurriculum: vi.fn(), createCurriculumVersion: vi.fn(), updateCurriculumVersion: vi.fn(), deleteCurriculumVersion: vi.fn(), createCurriculumTerm: vi.fn(), updateCurriculumTerm: vi.fn(), deleteCurriculumTerm: vi.fn() }))
const programId = '11111111-1111-4111-8111-111111111111'
const scope = { status: 'ready' as const, departmentIds: ['department'], selectedDepartmentId: 'department', departmentId: 'department', profileId: 'staff', canQuery: true as const, selectDepartment: vi.fn() }
const program = { id: programId, code: 'BSCS', name: 'Computer Science', department_id: 'department', nominal_duration: 4, status: 'active' as const }
const values: CurriculumVersionValues = { program_id: programId, version_label: '2027', effective_start: '2027-08-01', effective_end: '', total_units: 0, delinquency_threshold: 0, status: 'draft' }
const saved: CurriculumVersion = { ...values, version_label: 'BSCS 2027', id: 'new-version', effective_end: null, enrolled_student_count: 0 }

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><StaffScopeContext.Provider value={scope}><CurriculaPage /></StaffScopeContext.Provider></QueryClientProvider>)
  return client
}
async function openForm() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'Add version' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
  await screen.findByRole('dialog', { name: 'Add version' })
}
function fillForm() {
  fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '  2027  ' } })
  fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2027-08-01' } })
}
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {}
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

describe('Edit version validation', () => {
  it('supports the update label limit and excludes immutable fields from the request', () => {
    const label = 'x'.repeat(250)
    expect(curriculumVersionEditSchema.safeParse({ ...values, version_label: label }).success).toBe(true)
    expect(curriculumVersionEditSchema.safeParse({ ...values, version_label: label + 'x' }).success).toBe(false)
    expect(versionUpdateRequest(values)).toEqual({ version_label: '2027', effective_start: '2027-08-01', effective_end: null, total_units: 0, delinquency_threshold: 0, status: 'draft' })
  })
  it.each([{ effective_end: '2027-07-31' }, { total_units: -1 }, { delinquency_threshold: 1.1 }, { effective_start: '2027-02-30' }])('rejects invalid dates and units: %j', fields => {
    expect(curriculumVersionEditSchema.safeParse({ ...values, ...fields }).success).toBe(false)
  })
})

async function openEditForm() {
  await screen.findByRole('button', { name: 'Edit version' })
  fireEvent.click(screen.getByRole('button', { name: 'Edit version' }))
  await screen.findByRole('dialog', { name: 'Edit version' })
}

describe('Edit curriculum version', () => {
  beforeEach(() => {
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [saved] })
    vi.mocked(updateCurriculumVersion).mockResolvedValue({ ...saved, version_label: 'BSCS Revised 2027', total_units: 162.25, status: 'active' })
  })
  it('prefills the selected version, keeps the program fixed and refreshes the summary without changing selection', async () => {
    const other = { ...saved, id: 'other-version', version_label: 'Other version' }
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [other, saved] })
    const client = mount()
    await screen.findByLabelText('Curriculum version')
    fireEvent.change(screen.getByLabelText('Curriculum version'), { target: { value: saved.id } })
    await openEditForm()
    expect((screen.getByLabelText('Academic year') as HTMLInputElement).value).toBe('2027')
    expect((screen.getByLabelText('Effective from') as HTMLInputElement).value).toBe('2027-08-01')
    expect((screen.getByLabelText('Program') as HTMLInputElement).readOnly).toBe(true)
    expect((screen.getByLabelText('Required units') as HTMLInputElement).value).toBe('0')
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '  Revised 2027  ' } })
    fireEvent.change(screen.getByLabelText('Required units'), { target: { value: '162.25' } })
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Status' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('option', { name: 'active' }))
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [other, { ...saved, version_label: 'BSCS Revised 2027', total_units: 162.25, status: 'active' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Curriculum version updated.')
    expect(updateCurriculumVersion).toHaveBeenCalledExactlyOnceWith(saved.id, { version_label: 'BSCS Revised 2027', effective_start: '2027-08-01', effective_end: null, total_units: 162.25, delinquency_threshold: 0, status: 'active' })
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe(saved.id)
    expect(screen.getByText('162.25')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
    expect(createCurriculumVersion).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll().every(mutation => mutation.options.retry === false)).toBe(true)
  })
  it('preserves the existing end date and sends nothing on cancellation', async () => {
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [{ ...saved, effective_end: '2028-05-31' }] })
    mount()
    await openEditForm()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
    await openEditForm()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Curriculum version updated.')
    expect(vi.mocked(updateCurriculumVersion).mock.calls[0][1].effective_end).toBe('2028-05-31')
  })
  it.each([403, 409, 429, 500])('preserves edits on a %i response without automatic retries', async status => {
    vi.mocked(updateCurriculumVersion).mockRejectedValue(new ApiClientError(normalizeApiError({ message: 'Update rejected' }, new Response(null, { status }))))
    mount()
    await openEditForm()
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: 'Unsaved change' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Academic year') as HTMLInputElement).value).toBe('Unsaved change')
    expect(updateCurriculumVersion).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Curriculum version updated.')).toBeNull()
  })
  it('blocks a known stale form instead of overwriting refreshed values', async () => {
    const client = mount()
    await openEditForm()
    act(() => client.setQueryData(['staff', 'staff', 'department', 'curricula', {}], { programs: [program], versions: [{ ...saved, total_units: 160 }] }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText(/This version changed while the form was open/)
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
  })
  it('rechecks that the version still belongs to an authorized program', async () => {
    const client = mount()
    await openEditForm()
    act(() => client.setQueryData(['staff', 'staff', 'department', 'curricula', {}], { programs: [{ ...program, department_id: 'foreign' }], versions: [saved] }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText(/This version is no longer available in your authorized department/)
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
  })
  it('prevents repeat saves and closing while a request is pending', async () => {
    let finish!: (version: CurriculumVersion) => void
    vi.mocked(updateCurriculumVersion).mockReturnValue(new Promise(resolve => { finish = resolve }))
    mount()
    await openEditForm()
    const save = screen.getByRole('button', { name: 'Save changes' })
    fireEvent.click(save)
    fireEvent.click(save)
    await screen.findByRole('button', { name: 'Saving version...' })
    expect(updateCurriculumVersion).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    await act(async () => finish(saved))
    await screen.findByText('Curriculum version updated.')
  })
})

describe('Create curriculum version', () => {
  it('creates the first blank version, refreshes options and selects the returned version', async () => {
    const client = mount()
    await openForm()
    fillForm()
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [saved] })
    fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
    await screen.findByText('Curriculum version created.')
    expect(createCurriculumVersion).toHaveBeenCalledExactlyOnceWith({ ...values, version_label: 'BSCS 2027', total_units: 147, effective_end: null })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe(saved.id)
    expect(screen.getByText('Enrolled students')).toBeTruthy()
    expect(vi.mocked(listCurricula).mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(client.getMutationCache().getAll()[0].options.retry).toBe(false)
  })
  it('does not write on cancel or invalid input', async () => {
    mount()
    await openForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
    await screen.findByText('Enter a version label.')
    expect(createCurriculumVersion).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('validates the version label length after adding the program code', async () => {
    mount()
    await openForm()
    fillForm()
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: 'x'.repeat(96) } })
    fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
    expect(await screen.findByText('Use at most 100 characters after adding the program code.')).toBeTruthy()
    expect(createCurriculumVersion).not.toHaveBeenCalled()
  })
  it.each([403, 409, 429, 500])('retains form inputs after a %i server denial without automatic retry', async status => {
    vi.mocked(createCurriculumVersion).mockRejectedValue(new ApiClientError(normalizeApiError({ message: 'Creation rejected' }, new Response(null, { status }))))
    mount()
    await openForm()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Academic year') as HTMLInputElement).value).toBe('  2027  ')
    expect((screen.getByRole('button', { name: 'Add version' }) as HTMLButtonElement).disabled).toBe(false)
    expect(createCurriculumVersion).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Curriculum version created.')).toBeNull()
  })
  it('prevents duplicate requests while creation is pending', async () => {
    let finish!: (version: CurriculumVersion) => void
    vi.mocked(createCurriculumVersion).mockReturnValue(new Promise(resolve => { finish = resolve }))
    mount()
    await openForm()
    fillForm()
    const submit = screen.getByRole('button', { name: 'Add version' })
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
    fireEvent.click(screen.getByRole('button', { name: 'Add version' }))
    await screen.findByText('Select a program in your authorized department and retry.')
    expect(createCurriculumVersion).not.toHaveBeenCalled()
  })
})
