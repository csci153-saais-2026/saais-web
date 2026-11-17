import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import AdviserDashboard from './AdviserDashboard'
import { getAdviserDashboard, getSchoolTerms } from './adviser-dashboard.api'
import { getRoster } from '../advisees/advisees.api'
import { createDashboardPdf } from './export-dashboard'

const auth = vi.hoisted(() => ({ user: { id: 'adviser-one' }, isMockMode: true }))
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => auth }))
vi.mock('./adviser-dashboard.api', () => ({ getAdviserDashboard: vi.fn(), getSchoolTerms: vi.fn() }))
vi.mock('../advisees/advisees.api', () => ({ getRoster: vi.fn() }))
vi.mock('./export-dashboard', () => ({ createDashboardPdf: vi.fn(), dashboardPdfFilename: 'SAAIS-adviser-dashboard.pdf' }))

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
    vi.mocked(getRoster).mockResolvedValue([])
    render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect(await screen.findByText('1.75')).toBeTruthy()
    expect(screen.getByText('Showing shared sample records.')).toBeTruthy()
    expect(await screen.findByRole('button', { name: /With deficiencies/ })).toBeTruthy()
    expect(screen.getByText('Grade distribution is not available in this report.')).toBeTruthy()
    expect(getAdviserDashboard).toHaveBeenCalledWith(undefined)
  })

  it('opens the deficiencies card and links to the selected advisee', async () => {
    vi.mocked(getAdviserDashboard).mockResolvedValue({ ...report, advisees_with_deficiencies: [{ student_id: 'student-one', student_number: '2023-01', full_name: 'One Student', deficiencies: [{ course_code: 'CS 101' }] }] } as unknown as Awaited<ReturnType<typeof getAdviserDashboard>>)
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /With deficiencies/ }))
    expect((await screen.findByRole('link', { name: /One Student/ })).getAttribute('href')).toBe('/adviser/advisee/student-one/checklist')
    expect(screen.getByText('CS 101')).toBeTruthy()
  })

  it('shows errors and retries the shared report', async () => {
    vi.mocked(getAdviserDashboard).mockRejectedValueOnce(new Error('Dashboard unavailable')).mockResolvedValue(report)
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    vi.mocked(getRoster).mockResolvedValue([])
    render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('Dashboard unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('1.75')).toBeTruthy()
  })

  it('rejects a report belonging to a different adviser', async () => {
    vi.mocked(getAdviserDashboard).mockResolvedValue({ ...report, adviser_id: 'adviser-two' })
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect((await screen.findByRole('alert')).textContent).toContain('does not match the signed-in adviser')
    expect(screen.queryByText('1.75')).toBeNull()
  })

  it('does not show the previous account report while a new one is loading', async () => {
    vi.mocked(getAdviserDashboard).mockResolvedValueOnce(report).mockImplementationOnce(() => new Promise(() => {}))
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    vi.mocked(getRoster).mockResolvedValue([])
    const view = render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect(await screen.findByText('1.75')).toBeTruthy()
    auth.user = { id: 'adviser-two' }
    view.rerender(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
    expect(screen.queryByText('1.75')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Loading')
  })

  it('previews the selected adviser report and closes it on account switch', async () => {
    vi.mocked(getAdviserDashboard).mockResolvedValueOnce(report).mockImplementationOnce(() => new Promise(() => {}))
    vi.mocked(getSchoolTerms).mockResolvedValue([])
    vi.mocked(getRoster).mockResolvedValue([])
    vi.mocked(createDashboardPdf).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dashboard')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    try {
      const view = render(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
      const exportButton = await screen.findByRole('button', { name: 'Export PDF' })
      await waitFor(() => expect((exportButton as HTMLButtonElement).disabled).toBe(false))
      fireEvent.click(exportButton)
      const download = await screen.findByRole('link', { name: 'Download PDF' })
      expect(download.getAttribute('href')).toBe('blob:dashboard')
      expect(createDashboardPdf).toHaveBeenCalledWith(report, 'All terms', 0, undefined, undefined)
      auth.user = { id: 'adviser-two' }
      view.rerender(<MemoryRouter><AdviserDashboard /></MemoryRouter>)
      expect(screen.queryByRole('dialog', { name: 'Preview: Dashboard' })).toBeNull()
      expect(revokeUrl).toHaveBeenCalledWith('blob:dashboard')
    } finally { createUrl.mockRestore(); revokeUrl.mockRestore() }
  })
})
