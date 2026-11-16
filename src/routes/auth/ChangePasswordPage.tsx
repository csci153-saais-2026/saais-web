import * as React from 'react'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon, CheckIcon, EyeIcon } from '@/components/icons'
import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/use-auth'
import {
  changeAuthenticatedPassword,
  validatePasswordPolicy,
} from '@/lib/auth/auth-service'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = React.useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const isGoogleManagedAccount = user?.authProvider === 'google'
  const passwordRules = [
    { label: 'At least 12 characters', met: newPassword.length >= 12 && newPassword.length <= 128 },
    { label: 'Contains uppercase, lowercase, and a number', met: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) },
    { label: 'Different from your current password', met: newPassword.length > 0 && newPassword !== currentPassword },
    { label: 'Both new password fields match', met: confirmPassword.length > 0 && newPassword === confirmPassword },
  ]

  const togglePasswordVisibility = (field: keyof typeof visiblePasswords) => {
    setVisiblePasswords(current => ({ ...current, [field]: !current[field] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const validation = validatePasswordPolicy(newPassword, currentPassword)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const result = await changeAuthenticatedPassword(currentPassword, newPassword)

      setSuccessMessage(
        result.simulated
          ? 'Password change simulated in mock mode. In production, your password is updated and other active sessions are signed out.'
          : 'Your password has been changed successfully. Other active sessions have been signed out.',
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to change password.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-[30px]">
      <div className="w-full">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Change password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update the password for your account.</p>
        </header>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(270px,2fr)]">
      <Panel
        title="Your password"
        description="You'll need your current password to set a new one."
        className="mb-0 rounded-md border-border shadow-none ring-0"
        bodyClassName="gap-4 p-5"
      >
        {isGoogleManagedAccount ? (
          <Alert className="bg-muted/60 text-foreground border-border">
            <AlertIcon />
            <AlertDescription>
              Your institutional account (<span className="font-semibold">{user.email}</span>) is
              authenticated exclusively via Google Workspace OAuth. Password management is handled
              directly through your institutional Google Account settings.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {successMessage && (
              <Alert role="status" className="mb-4 border-primary/20 bg-primary/10 text-primary">
                <CheckIcon className="w-4 h-4 text-primary" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert role="alert" variant="destructive" className="mb-4">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={visiblePasswords.currentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={visiblePasswords.currentPassword ? 'Hide current password' : 'Show current password'}
                    aria-pressed={visiblePasswords.currentPassword}
                    onClick={() => togglePasswordVisibility('currentPassword')}
                  >
                    <EyeIcon aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={visiblePasswords.newPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="At least 12 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={visiblePasswords.newPassword ? 'Hide new password' : 'Show new password'}
                    aria-pressed={visiblePasswords.newPassword}
                    onClick={() => togglePasswordVisibility('newPassword')}
                  >
                    <EyeIcon aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={visiblePasswords.confirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                    aria-pressed={visiblePasswords.confirmPassword}
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                  >
                    <EyeIcon aria-hidden />
                  </Button>
                </div>
              </div>

              <ul aria-label="Password requirements" className="grid gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-[13px]">
                {passwordRules.map(rule => (
                  <li key={rule.label} className={`flex items-center gap-2.5 ${rule.met ? 'text-primary' : 'text-muted-foreground'}`}>
                    <span
                      aria-hidden="true"
                      className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${rule.met ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'}`}
                    >
                      <CheckIcon className="size-3" />
                    </span>
                    {rule.label}
                  </li>
                ))}
              </ul>

              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating password…' : 'Update password'}
                </Button>
                <Button type="button" variant="ghost" disabled={submitting} onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </div>
            </form>
          </>
        )}
      </Panel>
        </div>
      </div>
    </main>
  )
}
