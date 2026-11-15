import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import AdviserDashboard from './AdviserDashboard'
import { getAdviserDashboard, getSchoolTerms } from './adviser-dashboard.api'

const auth = vi.hoisted(() => ({ user: { id: 'adviser-one' }, isMockMode: true }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }))
vi.mock('./adviser-dashboard.api', () => ({ getAdviserDashboard: vi.fn(), getSchoolTerms: vi.fn() }))

const report = {
  adviser_id: 'adviser-one', total_advisees: 2,
  standing_counts: { good_standing: 2, warning: 0, probation: 0, dismissed: 0 },
  open_grade_flags_count: 0, pending_inc_count: 0, mean_gwa: 1.75, computed_at: '2026-11-10T09:00:00Z',
}

afterEach(() => { cleanup(); vi.resetAllMocks(); auth.user = { id: 'adviser-one' } })

describe('AdviserDashboard', () => {
  it('renders the shared report and labels unavailable optional fields', async () => {
    vi.mocked(getAdviserDashboard).mockResolvedValue(report)
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect(await screen.findByText('1.75')).toBeTruthy()
    expect(screen.getByText('Showing shared sample records.')).toBeTruthy()
    expect(screen.getByText('Details not available in this report')).toBeTruthy()
    expect(screen.getByText('Grade distribution is not available in this report.')).toBeTruthy()
    expect(getAdviserDashboard).toHaveBeenCalledWith(undefined)
  })

  it('shows errors and retries the shared report', async () => {
    vi.mocked(getAdviserDashboard).mockRejectedValueOnce(new Error('Dashboard unavailable')).mockResolvedValue(report)
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Dashboard unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('1.75')).toBeTruthy()
  })

  it('does not show the previous account report while a new one is loading', async () => {
    vi.mocked(getAdviserDashboard).mockResolvedValueOnce(report).mockImplementationOnce(() => new Promise(() => {}))
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    const view = render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect(await screen.findByText('1.75')).toBeTruthy()
    auth.user = { id: 'adviser-two' }
    view.rerender(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect(screen.queryByText('1.75')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Loading')
  })
})
