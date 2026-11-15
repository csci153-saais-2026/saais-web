import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ApiSchema } from '@/lib/api'
import AdviseeHistory from './AdviseeHistory'
import { getStudentHistory } from './history.api'

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: 'adviser-one' }, activeRole: 'adviser' }) }))
vi.mock('../../Adviser', () => ({ AdviserPage: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('./history.api', () => ({ getStudentHistory: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('filters the selected student’s audit entries by search and actor', async () => {
  vi.mocked(getStudentHistory).mockResolvedValue([
    { id: '1', student_id: 'student-one', actor_id: 'student-one', actor_role: 'student', actor_name: 'Student', action: 'plan.viewed', details_summary: 'Viewed plan', created_at: '2026-01-01T00:00:00Z' },
    { id: '2', student_id: 'student-one', actor_id: 'adviser-one', actor_role: 'adviser', actor_name: 'Adviser', action: 'note.created', details_summary: 'Added note', created_at: '2026-01-02T00:00:00Z' },
  ] as ApiSchema<'AuditLogEntry'>[])
  render(<MemoryRouter initialEntries={['/advisee/student-one/history']}><Routes><Route path="/advisee/:id/history" element={<AdviseeHistory />} /></Routes></MemoryRouter>)
  expect(await screen.findByText('note.created')).toBeTruthy()
  expect(getStudentHistory).toHaveBeenCalledWith('student-one')
  fireEvent.change(screen.getByLabelText('Search the audit log'), { target: { value: 'note' } })
  expect(screen.queryByText('plan.viewed')).toBeNull()
  fireEvent.change(screen.getByLabelText('Filter by actor'), { target: { value: 'student' } })
  expect(screen.queryByText('note.created')).toBeNull()
})
