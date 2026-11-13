import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_DEFAULT_ROUTE } from '@/lib/auth/auth-service'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon } from '@/components/icons'
import type { SaaisRole } from '@/mocks/personas'

interface ProtectedRouteProps {
  allowedRoles?: SaaisRole[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const {
    user,
    roles,
    activeRole,
    isLoading,
    isAllowedToEnter,
    entryBlockedReason,
    authError,
    retryHydration,
    signOut,
  } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-primary">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-muted-foreground">
            Verifying session…
          </span>
        </div>
      </div>
    )
  }

  if (authError && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full grid gap-4 p-6 rounded-lg border bg-card">
          <Alert variant="destructive">
            <AlertIcon />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={() => void retryHydration()}
              className="flex-1"
            >
              Retry
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void signOut()}
              className="flex-1"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !isAllowedToEnter) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, blockedReason: entryBlockedReason }}
        replace
      />
    )
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = roles.some((r) => allowedRoles.includes(r))
    if (!hasAllowedRole) {
      const target =
        (activeRole && roles.includes(activeRole) && ROLE_DEFAULT_ROUTE[activeRole]) ||
        (roles[0] && ROLE_DEFAULT_ROUTE[roles[0]]) ||
        '/login'
      return <Navigate to={target} replace />
    }
  }

  return children ? <>{children}</> : <Outlet />
}
