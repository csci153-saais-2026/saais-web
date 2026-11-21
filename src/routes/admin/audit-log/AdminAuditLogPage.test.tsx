import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import AdminAuditLogPage from './AdminAuditLogPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    apiClient: { GET: getMock },
  }
})

const entry = {
  id: 'audit-1',
  actor_name: 'Morgan Lee',
  actor_role: 'admin',
  student_name: 'Juan Dela Cruz',
  student_number: '24-1-00101',
  target_label: '24-1-00101 · Juan Dela Cruz',
  action: 'advising_plan_saved',
  action_category: 'plan_save',
  entity_type: 'advising_plan',
  details_summary: 'Saved an advising plan.',
  created_at: '2026-08-12T08:00:00Z',
  old_value: { secret: 'old snapshot' },
  new_value: { secret: 'new snapshot' },
  reason: 'sensitive internal reason',
}

function result(data: unknown, contentRange = '0-0/1') {
  return {
    data,
    error: undefined,
    response: new Response(null, {
      headers: { 'Content-Range': contentRange },
    }),
  }
}

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    getMock.mockResolvedValue(result([entry]))
  })

  afterEach(() => cleanup())

  it('loads institution-wide history with a safe projection and renders permitted details only', async () => {
    render(<AdminAuditLogPage />)

    expect(await screen.findByText('Morgan Lee')).toBeTruthy()
    expect(screen.getByText('Juan Dela Cruz')).toBeTruthy()
    expect(screen.getByText('Saved an advising plan.')).toBeTruthy()
    expect(screen.queryByText(/old snapshot|new snapshot|internal reason/)).toBeNull()
    expect(getMock).toHaveBeenCalledWith(
      '/rest/v1/audit_log_entry',
      {
        params: {
          query: {
            select:
              'id,actor_name,actor_role,student_name,student_number,target_label,action,action_category,entity_type,details_summary,created_at',
            order: 'created_at.desc,id.desc',
            limit: 25,
            offset: 0,
          },
        },
      },
    )
    expect(
      screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('applies person, student, action, and bounded date filters live', async () => {
    render(<AdminAuditLogPage />)
    await screen.findByText('Morgan Lee')

    fireEvent.change(screen.getByLabelText('Person'), {
      target: { value: 'Morgan' },
    })
    fireEvent.change(screen.getByLabelText('Student'), {
      target: { value: '24-1-' },
    })
    fireEvent.change(screen.getByLabelText('From date'), {
      target: { value: '2026-08-01' },
    })
    fireEvent.change(screen.getByLabelText('To date'), {
      target: { value: '2026-08-31' },
    })
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
    expect(getMock.mock.calls[1]).toEqual([
      '/rest/v1/audit_log_entry',
      {
        params: {
          query: {
            select:
              'id,actor_name,actor_role,student_name,student_number,target_label,action,action_category,entity_type,details_summary,created_at',
            order: 'created_at.desc,id.desc',
            limit: 25,
            offset: 0,
            actor_name: 'ilike.%Morgan%',
            or: '(student_name.ilike.%24-1-%,student_number.ilike.%24-1-%,target_label.ilike.%24-1-%)',
            and: '(created_at.gte.2026-08-01T00:00:00.000Z,created_at.lte.2026-08-31T23:59:59.999Z)',
          },
        },
      },
    ])
  })

  it('waits for both dates before filtering by range', async () => {
    render(<AdminAuditLogPage />)
    await screen.findByText('Morgan Lee')
    fireEvent.change(screen.getByLabelText('From date'), {
      target: { value: '2026-08-01' },
    })
    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('paginates using Content-Range and supports retry after a read error', async () => {
    const pageRows = Array.from({ length: 25 }, (_, index) => ({
      ...entry,
      id: `audit-${index}`,
    }))
    getMock
      .mockResolvedValueOnce(result(pageRows, '0-24/26'))
      .mockRejectedValueOnce(new Error('Audit service unavailable.'))
      .mockResolvedValueOnce(
        result(
          [{ ...entry, id: 'audit-last', student_name: 'Retry-only student' }],
          '25-25/26',
        ),
      )
    render(<AdminAuditLogPage />)

    expect(await screen.findByText('Page 1 · 26 entries')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Audit service unavailable.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Retry-only student')).toBeTruthy()
    expect(screen.getByText('Page 2 · 26 entries')).toBeTruthy()
    expect(screen.queryByText('Audit service unavailable.')).toBeNull()
    expect(getMock.mock.calls[1]?.[1]).toMatchObject({
      params: { query: { offset: 25 } },
    })
    expect(getMock.mock.calls[2]?.[1]).toMatchObject({
      params: { query: { offset: 25 } },
    })
    expect(
      screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('shows an explicit empty state', async () => {
    getMock.mockResolvedValueOnce(result([], '*/0'))
    render(<AdminAuditLogPage />)
    expect(
      await screen.findByText('No entries match these filters.'),
    ).toBeTruthy()
  })
})
