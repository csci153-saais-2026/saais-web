import * as React from 'react'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon, CheckIcon } from '@/components/icons'
import { useAuth } from '@/hooks/use-auth'
import { changeAuthenticatedPassword, validatePasswordPolicy } from '@/lib/auth/auth-service'

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const isGoogleManagedAccount = user?.authProvider === 'google'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

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
      await changeAuthenticatedPassword(currentPassword, newPassword)

      setSuccess(true)
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
    <div className="max-w-xl mx-auto py-8 px-4">
      <Panel title="Change Password" description="Update your institutional login password.">
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
            {success && (
              <Alert className="mb-4 bg-primary/10 text-primary border-primary/20">
                <CheckIcon className="w-4 h-4 text-primary" />
                <AlertDescription>
                  Your password has been changed successfully. Other active sessions have been
                  signed out.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  placeholder="At least 12 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              <Button type="submit" disabled={submitting} className="w-full mt-2">
                {submitting ? 'Updating password…' : 'Change Password'}
              </Button>
            </form>
          </>
        )}
      </Panel>
    </div>
  )
}
