import * as React from "react"
import { useNavigate } from "react-router"
import { PageHeading } from "@/components/features/page-heading"
import { Panel } from "@/components/features/panel"
import { SampleFooter } from "@/components/features/sample-footer"
import { Button } from "@/components/ui/button"
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  NotificationList,
  type NotificationFilterTab,
} from "./NotificationList"

export interface StudentNotificationsViewProps {
  readonly notifications: readonly ApiSchema<"Notification">[]
  readonly onMarkRead?: (notificationId: string) => Promise<void> | void
  readonly onMarkAllRead?: () => Promise<void> | void
  readonly onSelectNotification?: (
    notification: ApiSchema<"Notification">
  ) => void
  readonly isMarkingAll?: boolean
  readonly actionError?: string | null
  readonly className?: string
}

/**
 * Pure Student Notifications view accepting typed `ApiSchema<'Notification'>[]` props.
 */
export function StudentNotificationsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectNotification,
  isMarkingAll = false,
  actionError = null,
  className,
}: StudentNotificationsViewProps) {
  const [filter, setFilter] = React.useState<NotificationFilterTab>("all")

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  )

  const subtitle =
    unreadCount > 0
      ? `${unreadCount} unread ${
          unreadCount === 1 ? "notification" : "notifications"
        } waiting for your review.`
      : "You are all caught up."

  return (
    <div className={cn(className)}>
      <PageHeading
        title="Notifications"
        subtitle={subtitle}
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={() => void onMarkAllRead?.()}
            className="min-h-11 md:min-h-[38px]"
          >
            {isMarkingAll ? "Marking..." : "Mark all as read"}
          </Button>
        }
      />

      {actionError && (
        <p role="alert" className="mb-4 text-cell text-destructive">
          {actionError}
        </p>
      )}

      <NotificationList
        notifications={notifications}
        filter={filter}
        onFilterChange={setFilter}
        onMarkRead={(id) => void onMarkRead?.(id)}
        onSelectNotification={onSelectNotification}
      />

      <SampleFooter>
        Sample records for presentation · Reference date: 19 September 2026
      </SampleFooter>
    </div>
  )
}

async function fetchStudentNotifications(
  studentId: string
): Promise<readonly ApiSchema<"Notification">[]> {
  const res = await apiClient.GET("/rest/v1/notification", {
    params: {
      query: {
        recipient_id: postgrestFilter.eq(studentId),
        order: "created_at.desc",
      },
    },
  })
  return unwrapApiResult(res)
}

/**
 * Student Notifications page container handling loading, error/retry,
 * single mark-read, mark-all-read, and target-route navigation.
 */
export function StudentNotificationsPage({
  studentId,
}: {
  studentId: string
}) {
  const navigate = useNavigate()
  const [state, setState] = React.useState<{
    data: readonly ApiSchema<"Notification">[] | null
    isPending: boolean
    isError: boolean
  }>({
    data: null,
    isPending: true,
    isError: false,
  })
  const [isMarkingAll, setIsMarkingAll] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const refetch = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, isError: false }))
    try {
      const items = await fetchStudentNotifications(studentId)
      setState({ data: items, isPending: false, isError: false })
    } catch {
      setState({ data: null, isPending: false, isError: true })
    }
  }, [studentId])

  React.useEffect(() => {
    let cancelled = false
    fetchStudentNotifications(studentId)
      .then((items) => {
        if (!cancelled) {
          setState({ data: items, isPending: false, isError: false })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ data: null, isPending: false, isError: true })
        }
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  async function handleMarkRead(notificationId: string) {
    setActionError(null)
    try {
      const res = await apiClient.POST("/functions/v1/notifications/mark-read", {
        body: {
          notification_id: notificationId,
          mark_all: false,
          is_read: true,
        },
      })
      unwrapApiResult(res)
      const nowIso = new Date().toISOString()
      setState((prev) =>
        prev.data
          ? {
              ...prev,
              data: prev.data.map((item) =>
                item.id === notificationId
                  ? { ...item, is_read: true, read_at: item.read_at ?? nowIso }
                  : item
              ),
            }
          : prev
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Could not mark notification as read."
      )
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true)
    setActionError(null)
    try {
      const res = await apiClient.POST("/functions/v1/notifications/mark-read", {
        body: {
          mark_all: true,
          is_read: true,
        },
      })
      unwrapApiResult(res)
      const nowIso = new Date().toISOString()
      setState((prev) =>
        prev.data
          ? {
              ...prev,
              data: prev.data.map((item) => ({
                ...item,
                is_read: true,
                read_at: item.read_at ?? nowIso,
              })),
            }
          : prev
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Could not mark all notifications as read."
      )
    } finally {
      setIsMarkingAll(false)
    }
  }

  function handleSelectNotification(notification: ApiSchema<"Notification">) {
    if (notification.target_route) {
      void navigate(notification.target_route)
    }
  }

  if (state.isPending) {
    return <p role="status">Loading...</p>
  }

  if (state.isError || !state.data) {
    return (
      <Panel
        title="Unable to load notifications"
        description="We could not load your notifications right now."
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </Panel>
    )
  }

  return (
    <StudentNotificationsView
      notifications={state.data}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
      onSelectNotification={handleSelectNotification}
      isMarkingAll={isMarkingAll}
      actionError={actionError}
    />
  )
}

export default StudentNotificationsPage
