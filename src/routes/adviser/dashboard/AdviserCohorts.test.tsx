import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { ApiSchema } from '@/lib/api'
import { AdviserCohorts } from './AdviserCohorts'
import { getRoster } from '../advisees/advisees.api'

vi.mock('@/lib/api', () => ({
  apiClient: { GET: vi.fn(async () => ({ data: [{ id: 'program-one', nominal_duration: 4 }] })) },
  postgrestFilter: { inList: (ids: string[]) => `in.(${ids.join(',')})` },
  unwrapApiResult: (result: { data: unknown }) => result.data,
}))
vi.mock('../advisees/advisees.api', () => ({ getRoster: vi.fn() }))

const cohort: ApiSchema<'BatchCurriculumGwaRow'> = { entry_year: 2023, program_id: 'program-one', program_code: 'BSCS', curriculum_version_id: 'curriculum-one', curriculum_label: '2023', student_count: 1, mean_gwa: 1.75, good_standing_count: 1, at_risk_count: 0 }
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('shows the adviser-scoped cohort and only matching current advisees in its drill-down', async () => {
  vi.mocked(getRoster).mockResolvedValue([
    { student_id: 'student-one', full_name: 'Matching Student', student_number: '2023-1', entry_year: 2023, program_id: 'program-one', curriculum_version_id: 'curriculum-one', curriculum_label: '2023', gwa: 1.75 },
    { student_id: 'student-two', full_name: 'Other Cohort', student_number: '2024-1', entry_year: 2024, program_id: 'program-one', curriculum_version_id: 'curriculum-one', curriculum_label: '2023', gwa: 2 },
  ] as ApiSchema<'StudentRosterItem'>[])
  render(<MemoryRouter><AdviserCohorts userId="adviser-one" rows={[cohort]} /></MemoryRouter>)
  expect(await screen.findByText('2023–2027')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /View students/ }))
  const dialog = await screen.findByRole('dialog')
  expect((await within(dialog).findByRole('link', { name: 'Matching Student' })).getAttribute('href')).toBe('/adviser/advisee/student-one/checklist')
  expect(within(dialog).queryByText('Other Cohort')).toBeNull()
  expect(getRoster).toHaveBeenCalledWith('current')
})
