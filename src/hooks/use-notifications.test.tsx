import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useNotifications } from './use-notifications'

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }))
vi.mock('@/lib/api', () => ({ apiClient: api }))

function Harness({ userId }: { userId: string }) {
  const state = useNotifications(userId, false, 'adviser', '/adviser/notifications')
  return <div><output>{state.items.map(item => item.title).join(',')}</output><output aria-label="unread">{state.bellItems.filter(item => item.unread).length}</output><button onClick={() => void state.markAllRead()}>Mark all</button></div>
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('shared notification state', () => {
  it('clears one account while the next account is loading and only shows that account response', async () => {
    let finishFirst!: (value: { data: never[] }) => void
    api.GET.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    api.GET.mockResolvedValueOnce({ data: [{ id: 'n2', title: 'Second user item', body: '', target_route: '/admin/users', is_read: false, created_at: '2026-01-01T00:00:00Z' }] })
    const view = render(<Harness userId="first" />)
    view.rerender(<Harness userId="second" />)
    expect(screen.getByLabelText('unread').textContent).toBe('0')
    expect(screen.queryByText('First user item')).toBeNull()
    await waitFor(() => expect(screen.getByText('Second user item')).toBeTruthy())
    expect(screen.getByLabelText('unread').textContent).toBe('1')
    finishFirst({ data: [] })
    expect(screen.getByText('Second user item')).toBeTruthy()
  })

  it('posts mark-all-read and refreshes after success', async () => {
    api.GET.mockResolvedValue({ data: [] })
    api.POST.mockResolvedValue({ data: { updated_count: 1 } })
    render(<Harness userId="multi-role-account" />)
    await screen.findByRole('button', { name: 'Mark all' })
    screen.getByRole('button', { name: 'Mark all' }).click()
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/functions/v1/notifications/mark-read', { body: { mark_all: true, is_read: true } }))
  })
})
