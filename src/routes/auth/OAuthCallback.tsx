import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_DEFAULT_ROUTE } from '@/lib/auth/auth-service'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'

export default function OAuthCallback() {
  const {
    user,
    roles,
    activeRole,
    isLoading,
    isAllowedToEnter,
    entryBlockedReason,
    authError,
    retryHydration,
  } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(
      window.location.search || window.location.hash.replace(/^#/, ''),
    )
    const errorMsg = params.get('error_description') || params.get('error')

    if (errorMsg) {
      navigate(`/login?error=${encodeURIComponent(errorMsg)}`, { replace: true })
      return
    }

    if (isLoading || authError) return

    if (user && isAllowedToEnter && roles.length > 0) {
      const targetRole =
        activeRole && roles.includes(activeRole) ? activeRole : roles[0]
      const target = ROLE_DEFAULT_ROUTE[targetRole] || '/settings'
      navigate(target, { replace: true })
    } else if (entryBlockedReason) {
      navigate(`/login?error=${encodeURIComponent(entryBlockedReason)}`, {
        replace: true,
      })
    } else {
      navigate('/login', { replace: true })
    }
  }, [
    user,
    roles,
    activeRole,
    isLoading,
    isAllowedToEnter,
    entryBlockedReason,
    authError,
    navigate,
  ])

  if (authError) {
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
            <Link to="/login" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Return to Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-primary">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-muted-foreground">
          Completing institutional authentication…
        </span>
      </div>
    </div>
  )
}
