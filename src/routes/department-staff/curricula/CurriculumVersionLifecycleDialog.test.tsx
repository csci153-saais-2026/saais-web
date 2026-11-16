import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StaffScopeContext } from '../shared/use-staff-scope'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import { createCurriculumVersion, deleteCurriculumVersion, listCurricula, readCurriculum, updateCurriculumVersion, type CurriculumVersion } from './curricula.api'
import CurriculaPage from './CurriculaPage'

vi.mock('./curricula.api', () => ({ listCurricula: vi.fn(), readCurriculum: vi.fn(), createCurriculumVersion: vi.fn(), updateCurriculumVersion: vi.fn(), deleteCurriculumVersion: vi.fn() }))
const scope = { status: 'ready' as const, departmentIds: ['department'], selectedDepartmentId: 'department', departmentId: 'department', profileId: 'staff', canQuery: true as const, selectDepartment: vi.fn() }
const program = { id: 'program', code: 'BSCS', name: 'Computer Science', department_id: 'department', nominal_duration: 4, status: 'active' as const }
const version: CurriculumVersion = { id: 'v1', program_id: program.id, version_label: 'BSCS 2027', effective_start: '2027-08-01', total_units: 162, delinquency_threshold: 12, status: 'active', enrolled_student_count: 0 }
const remaining = { ...version, id: 'v2', version_label: 'BSCS 2024' }
const listKey = ['staff', 'staff', 'department', 'curricula', {}]
const detailKey = ['staff', 'staff', 'department', 'curriculum-overview', { versionId: 'v1' }]
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><StaffScopeContext.Provider value={scope}><CurriculaPage /></StaffScopeContext.Provider></QueryClientProvider>)
  return client
}
async function open(action: 'Retire' | 'Delete') {
  fireEvent.click(await screen.findByRole('button', { name: `${action} version` }))
  await screen.findByRole('dialog', { name: `${action} curriculum version` })
}
function rejection(status: number, message: string) {
  return new ApiClientError(normalizeApiError({ message }, new Response(null, { status })))
}
beforeEach(() => {
  vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [version, remaining] })
  vi.mocked(readCurriculum).mockResolvedValue({ terms: [], slots: [], courses: [] })
  vi.mocked(updateCurriculumVersion).mockResolvedValue({ ...version, status: 'retired' })
  vi.mocked(deleteCurriculumVersion).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('Curriculum version retirement and deletion', () => {
  it.each(['Retire', 'Delete'] as const)('names the %s target and sends no request on cancellation', async action => {
    mount()
    await open(action)
    expect(screen.getByRole('dialog').textContent).toContain('BSCS 2027')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
    expect(deleteCurriculumVersion).not.toHaveBeenCalled()
  })
  it('retires through a status-only update, preserving the selected version and its requirements', async () => {
    const client = mount()
    await open('Retire')
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [{ ...version, status: 'retired' }, remaining] })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm retirement' }))
    await screen.findByText('Curriculum version retired.')
    expect(updateCurriculumVersion).toHaveBeenCalledExactlyOnceWith(version.id, { status: 'retired' })
    expect(deleteCurriculumVersion).not.toHaveBeenCalled()
    expect(createCurriculumVersion).not.toHaveBeenCalled()
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe('v1')
    expect(screen.getByText('Retired')).toBeTruthy()
    expect(client.getQueryData(detailKey)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Retire version' })).toBeNull()
  })
  it('deletes only after success, removes the old detail cache and selects a valid remaining version', async () => {
    const client = mount()
    await open('Delete')
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [remaining] })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }))
    await screen.findByText('Curriculum version deleted.')
    expect(deleteCurriculumVersion).toHaveBeenCalledExactlyOnceWith(version.id)
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
    expect(client.getQueryData(detailKey)).toBeUndefined()
    expect((screen.getByLabelText('Curriculum version') as HTMLSelectElement).value).toBe('v2')
    expect(screen.queryByRole('option', { name: 'BSCS - BSCS 2027' })).toBeNull()
  })
  it('shows the empty state if the server permits deleting the final visible version', async () => {
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [version] })
    mount()
    await open('Delete')
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }))
    await screen.findByText('Curriculum version deleted.')
    expect(screen.getByText('No curriculum versions are available for your department.')).toBeTruthy()
    expect(screen.queryByLabelText('Curriculum version')).toBeNull()
  })
  it.each(['Referenced by student history', 'Last required version cannot be deleted'])('preserves the version on server rejection: %s', async message => {
    vi.mocked(deleteCurriculumVersion).mockRejectedValue(rejection(409, message))
    const client = mount()
    await open('Delete')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }))
    expect((await screen.findByRole('alert')).textContent).toContain(message)
    expect((client.getQueryData(listKey) as { versions: CurriculumVersion[] }).versions).toHaveLength(2)
    expect(screen.queryByText('Curriculum version deleted.')).toBeNull()
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Review retirement instead' }))
    await screen.findByRole('dialog', { name: 'Retire curriculum version' })
    expect(updateCurriculumVersion).not.toHaveBeenCalled()
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [{ ...version, status: 'retired' }, remaining] })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm retirement' }))
    await screen.findByText('Curriculum version retired.')
    expect(updateCurriculumVersion).toHaveBeenCalledExactlyOnceWith('v1', { status: 'retired' })
  })
  it.each([403, 409, 429, 500])('preserves the retirement target after %i and does not retry automatically', async status => {
    vi.mocked(updateCurriculumVersion).mockRejectedValue(rejection(status, 'Retirement rejected'))
    mount()
    await open('Retire')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm retirement' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('dialog').textContent).toContain('BSCS 2027')
    expect(updateCurriculumVersion).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Curriculum version retired.')).toBeNull()
  })
  it('prevents duplicate deletion and closing while the request is pending', async () => {
    let finish!: () => void
    vi.mocked(deleteCurriculumVersion).mockReturnValue(new Promise(resolve => { finish = resolve }))
    const client = mount()
    await open('Delete')
    const confirm = screen.getByRole('button', { name: 'Confirm deletion' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await screen.findByRole('button', { name: 'Deleting version...' })
    expect(deleteCurriculumVersion).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect((client.getQueryData(listKey) as { versions: CurriculumVersion[] }).versions).toHaveLength(2)
    vi.mocked(listCurricula).mockResolvedValue({ programs: [program], versions: [remaining] })
    await act(async () => finish())
    await screen.findByText('Curriculum version deleted.')
    expect(client.getMutationCache().getAll().every(mutation => mutation.options.retry === false)).toBe(true)
  })
  it('blocks stale targets and foreign department scope before sending a write', async () => {
    const client = mount()
    await open('Delete')
    act(() => client.setQueryData(listKey, { programs: [program], versions: [{ ...version, version_label: 'Changed version' }, remaining] }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }))
    await screen.findByText(/This version changed while the confirmation was open/)
    expect(deleteCurriculumVersion).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await open('Delete')
    act(() => client.setQueryData(listKey, { programs: [{ ...program, department_id: 'foreign' }], versions: [version, remaining] }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }))
    await screen.findByText(/This version is no longer available in your authorized department/)
    expect(deleteCurriculumVersion).not.toHaveBeenCalled()
  })
})
