import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { matchPath } from 'react-router'
import { apiClient, unwrapApiResult, type ApiSchema } from '@/lib/api'
import type { NotificationItem } from '@/components/features/notification-bell'
import { navigationConfig, type NavigationRole } from '@/navigation/navigation-config'

export const notificationQueryKey = (userId: string | undefined) => ['notifications', userId] as const

const EXTRA_ROUTES: Partial<Record<NavigationRole, string[]>> = {
  adviser: [
    '/adviser/advisee/:id',
    '/adviser/advisee/:id/checklist', '/adviser/advisee/:id/grades',
    '/adviser/advisee/:id/curriculum', '/adviser/advisee/:id/advising',
    '/adviser/advisee/:id/notes', '/adviser/advisee/:id/history',
  ],
}

export function isAuthorizedNotificationRoute(route: string | null | undefined, role: string | null): route is string {
  if (!route || !route.startsWith('/') || route.startsWith('//') || route.includes('\\') || route.includes('?') || route.includes('#')) return false
  if (!role || !(role in navigationConfig)) return false
  const allowed = ['/notifications', ...navigationConfig[role as NavigationRole].items.map(item => item.href)]
  return [...allowed, ...(EXTRA_ROUTES[role as NavigationRole] ?? [])]
    .some(pattern => matchPath({ path: pattern, end: true }, route) !== null)
}

function formatTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function useNotifications(userId: string | undefined, disabled: boolean, role: string | null, allHref?: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: notificationQueryKey(userId),
    enabled: Boolean(userId) && !disabled,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!userId) return []
      return unwrapApiResult(await apiClient.GET('/rest/v1/notification', {
        params: { query: { select: 'id,kind,title,body,target_route,is_read,created_at', order: 'created_at.desc', limit: 1000 } },
        signal,
      }))
    },
  })
  const markMutation = useMutation({
    mutationFn: async (body: ApiSchema<'MarkNotificationsReadRequest'>) => unwrapApiResult(await apiClient.POST('/functions/v1/notifications/mark-read', { body })),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: notificationQueryKey(userId) }),
  })
  const markAllRead = useCallback(() => markMutation.mutateAsync({ mark_all: true, is_read: true }), [markMutation])
  const markRead = useCallback((notificationId: string) => markMutation.mutateAsync({ notification_id: notificationId, mark_all: false, is_read: true }), [markMutation])
  const items = useMemo(() => Array.isArray(query.data) ? query.data : [], [query.data])
  const bellItems = useMemo<NotificationItem[]>(() => items.map(item => ({
    id: item.id,
    title: item.title,
    time: formatTime(item.created_at),
    unread: !item.is_read,
    to: isAuthorizedNotificationRoute(item.target_route, role) ? item.target_route : undefined,
  })), [items, role])
  return {
    items,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Unable to load notifications.' : null,
    markAllRead,
    markRead,
    markingRead: markMutation.isPending,
    markError: markMutation.error instanceof Error ? markMutation.error.message : null,
    bellItems,
    allHref,
    capped: items.length >= 1000,
  }
}
