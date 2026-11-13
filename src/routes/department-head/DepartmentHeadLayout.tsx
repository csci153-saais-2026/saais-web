import { useState } from "react"
import { Outlet, useLocation } from "react-router"
import { AuthenticatedPortalLayout } from "@/components/features/AuthenticatedPortalLayout"
import { NotificationBell } from "@/components/features/notification-bell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { deptHeadNav } from "@/navigation/navigation-config"
import { MOCK_DEPARTMENT_NOTIFICATIONS, type DepartmentNotificationsContext } from "./notifications/preview-data"
import { PreviewStateProvider } from "./shared/PreviewStateProvider"

function DepartmentHeadWorkspace() {
  const { pathname } = useLocation()
  const pageTitle = pathname === "/department-head/notifications"
    ? "Notifications"
    : deptHeadNav.items.find(({ to }) => to === pathname.replace(/\/$/, ""))?.label
  const [notifications, setNotifications] = useState(MOCK_DEPARTMENT_NOTIFICATIONS)

  const markNotificationRead = (id: string) => {
    setNotifications((current) =>
      current.map((item) => item.id === id ? { ...item, unread: false } : item)
    )
  }

  const markAllNotificationsRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })))
  }

  const notificationState: DepartmentNotificationsContext = {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  }

  return (
    <AuthenticatedPortalLayout
      currentPage={pageTitle}
      topbarTrailing={
        <NotificationBell
          items={notifications}
          allHref="/department-head/notifications"
          onMarkAllRead={markAllNotificationsRead}
        />
      }
    >
      <PreviewStateProvider>
        <Alert variant="advisory" className="mb-4">
          <AlertDescription>Department Head preview. These pages use sample records and changes stay in this session.</AlertDescription>
        </Alert>
        <Outlet context={notificationState} />
      </PreviewStateProvider>
    </AuthenticatedPortalLayout>
  )
}

export function DepartmentHeadLayout() {
  const { user } = useAuth()
  return <DepartmentHeadWorkspace key={user?.id} />
}
