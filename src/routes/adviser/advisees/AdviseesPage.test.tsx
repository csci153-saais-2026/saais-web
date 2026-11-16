import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import type { ApiSchema } from '@/lib/api'
import AdviseesPage from './AdviseesPage'
import { SelectedStudentHeader } from './SelectedStudentHeader'
import { getRoster, getSelectedStudent } from './advisees.api'

const auth = vi.hoisted(() => ({ user: { id: 'adviser-one' } }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }))
vi.mock('./advisees.api', () => ({ getRoster: vi.fn(), getSelectedStudent: vi.fn() }))
const student = (id: string, name: string) => ({ student_id: id, full_name: name, student_number: `number-${id}`, email: `${id}@example.test`, program_name: 'Computing', curriculum_label: '2023', year_level: 2, gwa: 1.5, open_flags_count: 0, deficiencies_count: 0, standing: 'good_standing', is_delinquent: false }) as ApiSchema<'StudentRosterItem'>
const first = student('11111111-1111-4111-8111-111111111111', 'First Student')
const second = student('22222222-2222-4222-8222-222222222222', 'Second Student')
afterEach(() => { cleanup(); vi.resetAllMocks(); auth.user = { id: 'adviser-one' } })

describe('advisee identity', () => {
  it('opens the selected row by mouse or keyboard', async () => {
    vi.mocked(getRoster).mockResolvedValue([first, second])
    function Location() { return <p data-testid="location">{useLocation().pathname}</p> }
    render(<MemoryRouter><AdviseesPage /><Location /></MemoryRouter>)
    fireEvent.click((await screen.findByText('Second Student')).closest('tr')!)
    expect(screen.getByTestId('location').textContent).toBe(`/adviser/advisee/${second.student_id}/checklist`)
    fireEvent.keyDown(screen.getByRole('row', { name: "Open First Student's record" }), { key: 'Enter' })
    expect(screen.getByTestId('location').textContent).toBe(`/adviser/advisee/${first.student_id}/checklist`)
  })
  it('links each roster row to its own UUID and requests past scope', async () => {
    vi.mocked(getRoster).mockResolvedValue([first, second])
    render(<MemoryRouter><AdviseesPage /></MemoryRouter>)
    expect((await screen.findByRole('link', { name: 'First Student' })).getAttribute('href')).toBe(`/adviser/advisee/${first.student_id}/checklist`)
    expect(screen.getByRole('link', { name: 'Second Student' }).getAttribute('href')).toBe(`/adviser/advisee/${second.student_id}/checklist`)
    fireEvent.click(screen.getByRole('button', { name: 'Past' }))
    expect(await screen.findByText('Second Student')).toBeTruthy()
    expect(getRoster).toHaveBeenCalledWith('past', '')
  })
  it('clears the previous identity on student and account changes', async () => {
    vi.mocked(getSelectedStudent).mockResolvedValueOnce(first).mockImplementation(() => new Promise(() => {}))
    const view = render(<SelectedStudentHeader id={first.student_id} />)
    expect(await screen.findByText('First Student')).toBeTruthy()
    view.rerender(<SelectedStudentHeader id={second.student_id} />)
    expect(screen.queryByText('First Student')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Loading')
    auth.user = { id: 'adviser-two' }
    view.rerender(<SelectedStudentHeader id={first.student_id} />)
    expect(screen.queryByText('First Student')).toBeNull()
  })
  it('shows loading, retry, search and empty states', async () => {
    vi.mocked(getRoster).mockRejectedValueOnce(new Error('Roster unavailable')).mockResolvedValue([])
    render(<MemoryRouter><AdviseesPage /></MemoryRouter>)
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect((await screen.findByRole('alert')).textContent).toContain('Roster unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No records match. Try another search or filter.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search advisees'), { target: { value: 'number-123' } })
    await waitFor(() => expect(getRoster).toHaveBeenCalledWith('current', 'number-123'))
  })
  it('filters by the shared delinquency indicator', async () => {
    vi.mocked(getRoster).mockResolvedValue([first, { ...second, is_delinquent: true }])
    render(<MemoryRouter><AdviseesPage /></MemoryRouter>)
    expect(await screen.findByText('First Student')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Standing'), { target: { value: 'flagged' } })
    expect(screen.queryByText('First Student')).toBeNull()
    expect(screen.getByText('Second Student')).toBeTruthy()
  })
})
