import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '../hooks/useSession'
import type { UserRole } from '../context/session-context'

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { session, role, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8EF]">
        <div className="flex flex-col items-center gap-3 text-[#2F4A12]">
          <div className="w-8 h-8 border-3 border-[#2F4A12] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const roleDefaultRoute: Record<UserRole, string> = {
      student: '/student',
      adviser: '/adviser',
      admin: '/admin',
    }
    return <Navigate to={roleDefaultRoute[role] || '/login'} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
