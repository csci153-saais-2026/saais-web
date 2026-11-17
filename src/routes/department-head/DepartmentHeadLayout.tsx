import { Outlet, useLocation } from "react-router"
import { AuthenticatedPortalLayout } from "@/components/features/AuthenticatedPortalLayout"
import { useAuth } from "@/hooks/use-auth"
import { deptHeadNav } from "@/navigation/department-head"
import { DepartmentToastProvider } from "./shared/DepartmentToastProvider"

function DepartmentHeadWorkspace() {
  const { pathname } = useLocation()
  const pageTitle = pathname === "/department-head/notifications"
    ? "Notifications"
    : deptHeadNav.items.find(({ href }) => href === pathname.replace(/\/$/, ""))?.label

  return (
    <AuthenticatedPortalLayout currentPage={pageTitle}>
      <DepartmentToastProvider>
        <Outlet />
      </DepartmentToastProvider>
    </AuthenticatedPortalLayout>
  )
}

export function DepartmentHeadLayout() {
  const { user } = useAuth()
  return <DepartmentHeadWorkspace key={user?.id} />
}
