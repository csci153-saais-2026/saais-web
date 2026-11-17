import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { useNotifications } from './use-notifications'
import { NotificationBell } from '@/components/features/notification-bell'

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }))
vi.mock('@/lib/api', () => ({
  apiClient: api,
  unwrapApiResult: (result: { data?: unknown; error?: unknown }) => {
    if (result.error) throw result.error
    return result.data
  },
}))

const notification = (id: string, title: string, is_read = false) => ({ id, title, body: 'Details', target_route: '/adviser/grade-flags', kind: 'flag', event_type: 'grade_flag_submitted', is_read, created_at: '2026-01-01T00:00:00Z' })
function Provider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }))
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}
function Harness({ userId, role = 'adviser', mirror = false }: { userId: string; role?: string; mirror?: boolean }) {
  const state = useNotifications(userId, false, role, '/notifications')
  return <div><output aria-label="items">{state.items.map(item => item.title).join(',')}</output><output aria-label="unread">{state.bellItems.filter(item => item.unread).length}</output><output aria-label="links">{state.bellItems.map(item => item.to ?? 'safe-fallback').join(',')}</output><output aria-label="loading">{String(state.loading)}</output><output aria-label="empty">{String(!state.loading && !state.error && state.items.length === 0)}</output><button onClick={() => void state.markRead('n1')}>Mark read</button><button onClick={() => void state.markAllRead()}>Mark all</button><NotificationBell items={state.bellItems} allHref={state.allHref} loading={state.loading} error={state.error} onMarkAllRead={state.markAllRead} showUnreadCount={!state.capped} />{mirror && <Mirror userId={userId} />}{state.error && <p role="alert">{state.error}</p>}</div>
}
function Mirror({ userId }: { userId: string }) {
  const state = useNotifications(userId, false, 'adviser', '/notifications')
  return <output aria-label="page-shared-unread">{state.items.filter(item => !item.is_read).length}</output>
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('shared notification state', () => {
  it('requests the account collection and displays only the response for the signed-in account', async () => {
    api.GET.mockResolvedValue({ data: [notification('n1', 'Account-owned item')] })
    render(<Provider><Harness userId="account-a" /></Provider>)
    await screen.findByText('Account-owned item')
    expect(api.GET).toHaveBeenCalledWith('/rest/v1/notification', expect.objectContaining({ params: { query: expect.objectContaining({ limit: 1000 }) } }))
    expect(JSON.stringify(api.GET.mock.calls[0])).not.toContain('recipient_id')
  })

  it('clears one account while the next account is loading and ignores a stale response', async () => {
    let finishFirst!: (value: { data: never[] }) => void
    api.GET.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
    api.GET.mockResolvedValueOnce({ data: [notification('n2', 'Second account item')] })
    const view = render(<Provider><Harness userId="first" /></Provider>)
    view.rerender(<Provider><Harness userId="second" /></Provider>)
    expect(screen.getByLabelText('unread').textContent).toBe('0')
    expect(screen.getByLabelText('items').textContent).toBe('')
    await waitFor(() => expect(screen.getByLabelText('items').textContent).toContain('Second account item'))
    finishFirst({ data: [] })
    expect(screen.getByLabelText('items').textContent).toContain('Second account item')
  })

  it('keeps one multi-role account collection when its active portal changes', async () => {
    api.GET.mockResolvedValue({ data: [notification('n1', 'My own notification')] })
    const view = render(<Provider><Harness userId="multi-role-account" role="adviser" /></Provider>)
    await screen.findByText('My own notification')
    view.rerender(<Provider><Harness userId="multi-role-account" role="admin" /></Provider>)
    expect(screen.getByLabelText('items').textContent).toContain('My own notification')
    expect(api.GET).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('links').textContent).toContain('safe-fallback')
  })

  it('marks a notification read and refreshes the shared account query after success', async () => {
    api.GET.mockResolvedValueOnce({ data: [notification('n1', 'Shared unread item')] }).mockResolvedValueOnce({ data: [notification('n1', 'Shared unread item', true)] })
    api.POST.mockResolvedValue({ data: { updated_count: 1 } })
    render(<Provider><Harness userId="multi-role-account" mirror /></Provider>)
    await screen.findByText('Shared unread item')
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith('/functions/v1/notifications/mark-read', { body: { notification_id: 'n1', mark_all: false, is_read: true } }))
    await waitFor(() => expect(screen.getByLabelText('unread').textContent).toBe('0'))
    expect(screen.getByLabelText('page-shared-unread').textContent).toBe('0')
  })

  it('exposes loading, empty, and API error states through the bell', async () => {
    let rejectLoad!: (reason: Error) => void
    api.GET.mockImplementationOnce(() => new Promise((_, reject) => { rejectLoad = reject }))
    const view = render(<Provider><Harness userId="loading-user" /></Provider>)
    expect(screen.getByLabelText('loading').textContent).toBe('true')
    rejectLoad(new Error('Notification service unavailable'))
    expect((await screen.findByRole('alert')).textContent).toContain('Notification service unavailable')
    api.GET.mockResolvedValueOnce({ data: [] })
    view.rerender(<Provider><Harness userId="empty-user" /></Provider>)
    await waitFor(() => expect(screen.getByLabelText('empty').textContent).toBe('true'))
  })

  it('routes only to a valid destination authorized for the active portal', async () => {
    api.GET.mockResolvedValue({ data: [
      { ...notification('ok', 'Valid adviser route'), target_route: '/adviser/grade-flags' },
      { ...notification('bad', 'Unknown adviser route'), target_route: '/adviser/not-a-real-route' },
      { ...notification('other', 'Other role route'), target_route: '/admin/accounts' },
    ] })
    render(<Provider><Harness userId="route-user" /></Provider>)
    await waitFor(() => expect(screen.getByLabelText('items').textContent).toContain('Valid adviser route'))
    expect(screen.getByLabelText('links').textContent).toContain('/adviser/grade-flags')
    expect(screen.getByLabelText('links').textContent).toContain('safe-fallback')
  })
})
