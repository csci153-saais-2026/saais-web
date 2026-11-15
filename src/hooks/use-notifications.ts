import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient, type ApiSchema } from '@/lib/api'
import type { NotificationItem } from '@/components/features/notification-bell'

function safeDestination(route: string | null | undefined, role: string | null): string | undefined {
  if (!route || !route.startsWith('/') || route.startsWith('//') || route.includes('\\')) return undefined
  const allowedPrefixes: Record<string, string[]> = {
    student: ['/student/'], adviser: ['/adviser/'], department_head: ['/department-head/', '/dept-head/'],
    department_staff: ['/department-staff/', '/staff/'], dean: ['/dean/'], admin: ['/admin/'],
  }
  return allowedPrefixes[role ?? '']?.some(prefix => route.startsWith(prefix)) ? route : undefined
}

function formatTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function useNotifications(userId: string | undefined, disabled: boolean, role: string | null, allHref?: string) {
  const [snapshot, setSnapshot] = useState<{ userId: string | undefined; items: ApiSchema<'Notification'>[]; loading: boolean; error: string | null; version: number }>({ userId: undefined, items: [], loading: false, error: null, version: 0 })
  const isCurrent = snapshot.userId === userId
  const items = useMemo(() => isCurrent ? snapshot.items : [], [isCurrent, snapshot.items])
  const loading = disabled || !userId ? false : isCurrent ? snapshot.loading : true
  const error = isCurrent ? snapshot.error : null
  const version = isCurrent ? snapshot.version : 0

  useEffect(() => {
    let current = true
    if (disabled || !userId) return () => { current = false }
    void apiClient.GET('/rest/v1/notification', {
      params: { query: { select: 'id,title,body,target_route,is_read,created_at', order: 'created_at.desc', limit: 1000 } },
    }).then(({ data, error: requestError }) => {
      if (!current) return
      if (requestError) throw requestError
      setSnapshot({ userId, items: data ?? [], loading: true, error: null, version })
    }).catch((requestError: unknown) => {
      if (current) setSnapshot({ userId, items: [], loading: false, error: requestError instanceof Error ? requestError.message : 'Unable to load notifications.', version })
    }).finally(() => { if (current) setSnapshot(value => value.userId === userId ? { ...value, loading: false } : value) })
    return () => { current = false }
  }, [userId, disabled, version])

  const refresh = useCallback(() => setSnapshot(value => ({ ...value, version: value.version + 1 })), [])
  const markAllRead = useCallback(async () => {
    const { error: requestError } = await apiClient.POST('/functions/v1/notifications/mark-read', { body: { mark_all: true, is_read: true } })
    if (requestError) throw requestError
    refresh()
  }, [refresh])

  const bellItems = useMemo<NotificationItem[]>(() => items.map(item => ({
    id: item.id,
    title: item.title,
    time: formatTime(item.created_at),
    unread: !item.is_read,
    to: safeDestination(item.target_route, role),
  })), [items, role])
  const capped = items.length >= 1000

  return {
    items,
    loading,
    error,
    refresh,
    markAllRead,
    bellItems,
    allHref,
    capped,
  }
}
