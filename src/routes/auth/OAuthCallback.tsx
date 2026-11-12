import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_DEFAULT_ROUTE } from '@/lib/auth/auth-service'

export default function OAuthCallback() {
  const { user, activeRole, isLoading, isAllowedToEnter, entryBlockedReason } = useAuth()
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

    if (isLoading) return

    if (user && isAllowedToEnter && activeRole) {
      const target = ROLE_DEFAULT_ROUTE[activeRole] || '/docs'
      navigate(target, { replace: true })
    } else if (user && !isAllowedToEnter) {
      const blockedMsg =
        entryBlockedReason || 'Your institutional account is not authorized to enter SAAIS.'
      navigate(`/login?error=${encodeURIComponent(blockedMsg)}`, { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }, [user, activeRole, isLoading, isAllowedToEnter, entryBlockedReason, navigate])

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
