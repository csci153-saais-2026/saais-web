import * as React from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/components/features/auth-layout'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon, CheckIcon } from '@/components/icons'
import { useAuth } from '@/hooks/use-auth'
import {
  completePasswordReset,
  validatePasswordPolicy,
} from '@/lib/auth/auth-service'

export default function ResetPasswordPage() {
  const { isPasswordRecovery, isLoading, user } = useAuth()
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [wasSimulated, setWasSimulated] = React.useState(false)

  // A verified recovery session is strictly required:
  // - In real Supabase mode: isPasswordRecovery MUST be true (emitted by PASSWORD_RECOVERY event
  //   after code/token exchange has verified the user with Supabase Auth).
  // - In mock mode: requires an explicit valid recovery session or mock query indicator
  //   without an ordinary signed-in user session attempting password reset.
  const isOrdinarySignedInUser = Boolean(user && !isPasswordRecovery)
  const canResetPassword = isPasswordRecovery && !isOrdinarySignedInUser

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!canResetPassword) {
      setError('A verified password recovery session is required.')
      return
    }

    const validation = validatePasswordPolicy(password)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const result = await completePasswordReset(password)
      setWasSimulated(result.simulated)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reset password.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      kicker="Visayas State University"
      headline="Reset Password"
      bullets={[
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Establish a new institutional password',
        },
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Protect your academic account records',
        },
      ]}
    >
      <Panel title="Set Password" description="Create your new institutional login password.">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Verifying recovery session…</p>
          </div>
        ) : !canResetPassword && !success ? (
          <div className="grid gap-4">
            <h2 className="text-2xl font-bold">Invalid or Expired Recovery Link</h2>
            <Alert variant="destructive">
              <AlertIcon />
              <AlertDescription>
                {isOrdinarySignedInUser
                  ? 'You are currently signed in with an active institutional session. To change your password, use Account Settings.'
                  : 'This page requires a verified password recovery session initiated from your institutional email link. If your link has expired or is invalid, please request a new recovery link.'}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 mt-2">
              {isOrdinarySignedInUser ? (
                <Link to="/settings" className="w-full">
                  <Button className="w-full">Go to Account Settings</Button>
                </Link>
              ) : (
                <Link to="/forgot-password" className="w-full">
                  <Button className="w-full">Request New Recovery Link</Button>
                </Link>
              )}
            </div>
          </div>
        ) : success ? (
          <div className="grid gap-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Password Reset Complete</h2>
            <p className="text-sm text-muted-foreground">
              {wasSimulated
                ? 'Password reset was simulated in mock mode. In production, your institutional password is updated and you can sign in with your new credentials.'
                : 'Your password has been successfully updated. You may now sign in with your new password.'}
            </p>
            <Link to="/login" className="w-full mt-2">
              <Button className="w-full">Sign in to your account</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <h2 className="text-2xl font-bold">Set a new password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your new password below. Must be at least 12 characters.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">
                  Must be 12–128 characters with uppercase, lowercase, and number.
                </span>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={submitting} className="w-full mt-2">
                {submitting ? 'Updating password…' : 'Update Password'}
              </Button>
            </form>
          </div>
        )}
      </Panel>
    </AuthLayout>
  )
}
