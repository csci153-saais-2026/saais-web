import * as React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/features/auth-layout'
import { Panel } from '@/components/features/panel'
import { SignInForm } from '@/components/features/sign-in-form'
import type { SignInValues } from '@/components/features/sign-in-schema'
import { CheckIcon } from '@/components/icons'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_DEFAULT_ROUTE } from '@/lib/auth/auth-service'
import type { SaaisRole } from '@/mocks/personas'

interface LoginLocationState {
  from?: { pathname: string }
  blockedReason?: string | null
}

function isDestinationAllowedForRoles(
  pathname: string,
  roles: readonly SaaisRole[],
): boolean {
  if (pathname.startsWith('/student')) return roles.includes('student')
  if (pathname.startsWith('/adviser')) return roles.includes('adviser')
  if (
    pathname.startsWith('/department-head') ||
    pathname.startsWith('/dept-head')
  ) {
    return roles.includes('department_head')
  }
  if (
    pathname.startsWith('/department-staff') ||
    pathname.startsWith('/staff')
  ) {
    return roles.includes('department_staff')
  }
  if (pathname.startsWith('/dean')) return roles.includes('dean')
  if (pathname.startsWith('/admin')) return roles.includes('admin')
  if (pathname === '/settings' || pathname === '/change-password') return true
  return true
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    user,
    roles,
    activeRole,
    isLoading,
    isAllowedToEnter,
    entryBlockedReason,
    authError,
    signInWithPassword,
    signInWithGoogle,
  } = useAuth()

  const locationState = (location.state as LoginLocationState | null) ?? null

  const [errorMessage, setErrorMessage] = React.useState<string | null>(() => {
    if (locationState?.blockedReason) {
      return locationState.blockedReason
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error_description') || params.get('error')
      if (err) {
        return err.includes('whitelist') ||
          err.includes('not provisioned') ||
          err.includes('registered')
          ? 'Sign-in was rejected: Your institutional email is not pre-registered. Please contact your department administrator for access.'
          : err
      }
    }
    return null
  })

  React.useEffect(() => {
    if (isLoading || !user || !isAllowedToEnter || roles.length === 0) return

    const fallbackRole = activeRole && roles.includes(activeRole) ? activeRole : roles[0]
    const defaultPortal = ROLE_DEFAULT_ROUTE[fallbackRole] ?? '/settings'
    const fromPath = locationState?.from?.pathname

    const target =
      fromPath &&
      fromPath !== '/login' &&
      isDestinationAllowedForRoles(fromPath, roles)
        ? fromPath
        : defaultPortal

    navigate(target, { replace: true })
  }, [
    isLoading,
    user,
    roles,
    activeRole,
    isAllowedToEnter,
    locationState,
    navigate,
  ])

  const handleSignIn = async (values: SignInValues) => {
    setErrorMessage(null)
    try {
      await signInWithPassword(values.email, values.password, values.keep)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please verify your credentials and try again.'
      setErrorMessage(msg)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to initiate Google sign-in.'
      setErrorMessage(msg)
    }
  }

  const displayedError = errorMessage ?? authError ?? entryBlockedReason

  return (
    <AuthLayout
      kicker="Visayas State University"
      headline="Student Academic Advising Information System"
      bullets={[
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Interactive curriculum audit and tracking',
        },
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Official course prerequisite trees and progress projections',
        },
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Direct academic adviser communication and note logging',
        },
      ]}
    >
      <Panel
        title="Sign in"
        description="Use your institutional account to continue."
      >
        <SignInForm
          error={displayedError}
          onSubmit={handleSignIn}
          onGoogle={handleGoogleSignIn}
          forgotHref="/forgot-password"
        />
      </Panel>
    </AuthLayout>
  )
}
