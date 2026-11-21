import * as React from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/components/features/auth-layout'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon, CheckIcon } from '@/components/icons'
import type { ApiSchema } from '@/lib/api'
import {
  declineInvitationToken,
  extractInviteTokenFromHash,
  previewInvitationToken,
  validatePasswordPolicy,
  verifyInvitationToken,
} from '@/lib/auth/auth-service'

type PreviewData = ApiSchema<'PreviewInviteResponse'>

export default function InvitePage() {
  const [token] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash
    const extracted = extractInviteTokenFromHash(hash)
    if (hash) {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      )
    }
    return extracted
  })

  const [loadingPreview, setLoadingPreview] = React.useState<boolean>(() => Boolean(token))
  const [previewError, setPreviewError] = React.useState<string | null>(() =>
    token ? null : 'No invitation token found. Please check your invitation email link.',
  )
  const [preview, setPreview] = React.useState<PreviewData | null>(null)

  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [declined, setDeclined] = React.useState(false)

  React.useEffect(() => {
    if (!token) return

    let isCancelled = false

    async function loadPreview(tok: string) {
      try {
        const data = await previewInvitationToken(tok)
        if (!isCancelled) {
          setPreview(data)
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'An error occurred while loading your invitation.'
          setPreviewError(msg)
        }
      } finally {
        if (!isCancelled) {
          setLoadingPreview(false)
        }
      }
    }

    void loadPreview(token)

    return () => {
      isCancelled = true
    }
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionError(null)

    if (!token) {
      setActionError('Invalid invitation session.')
      return
    }

    const validation = validatePasswordPolicy(password)
    if (!validation.valid) {
      setActionError(validation.error)
      return
    }

    if (password !== confirmPassword) {
      setActionError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const data = await verifyInvitationToken(token, password)
      setSuccessMessage(
        data?.message || 'Your institutional account has been successfully activated!',
      )
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'An error occurred during account activation.'
      setActionError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    if (!token) return

    setSubmitting(true)
    setActionError(null)

    try {
      await declineInvitationToken(token)
      setDeclined(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to decline invitation.'
      setActionError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      kicker="Visayas State University"
      headline="Institutional Account Invitation"
      bullets={[
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Accept your pre-registered academic advising account',
        },
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Establish your institutional login password',
        },
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Verify your faculty and department assignment',
        },
      ]}
    >
      <Panel title="Account Setup" description="Complete your institutional registration.">
        {loadingPreview ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Verifying invitation token…</p>
          </div>
        ) : previewError ? (
          <div className="grid gap-4">
            <h2 className="text-2xl font-bold">Invitation Error</h2>
            <Alert variant="destructive">
              <AlertIcon />
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              If your link has expired or is invalid, please ask your department administrator to
              resend your invitation.
            </p>
            <Link to="/login" className="inline-block mt-2">
              <Button variant="outline" className="w-full">
                Return to Sign in
              </Button>
            </Link>
          </div>
        ) : declined ? (
          <div className="grid gap-4 text-center py-4">
            <h2 className="text-2xl font-bold">Invitation Declined</h2>
            <p className="text-sm text-muted-foreground">
              You have declined this institutional invitation. The invitation link has been
              invalidated.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full mt-2">
                Return to Sign in
              </Button>
            </Link>
          </div>
        ) : successMessage ? (
          <div className="grid gap-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Account Activated!</h2>
            <p className="text-sm text-muted-foreground">{successMessage}</p>
            <Link to="/login" className="w-full mt-2">
              <Button className="w-full">Sign in to your account</Button>
            </Link>
          </div>
        ) : preview ? (
          <div className="grid gap-5">
            <div>
              <h2 className="text-2xl font-bold">Welcome, {preview.full_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You have been invited to join SAAIS as{' '}
                <span className="font-semibold text-foreground capitalize">
                  {preview.role.replace(/_/g, ' ')}
                </span>{' '}
                for {preview.department_name || preview.faculty_name}.
              </p>
            </div>

            <div className="p-3.5 bg-muted/50 rounded-md border text-xs grid gap-1.5">
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{preview.email}</span>
              </div>
              {preview.department_name && (
                <div>
                  <span className="text-muted-foreground">Department: </span>
                  <span className="font-medium">{preview.department_name}</span>
                </div>
              )}
              {preview.faculty_name && (
                <div>
                  <span className="text-muted-foreground">Faculty/College: </span>
                  <span className="font-medium">{preview.faculty_name}</span>
                </div>
              )}
              {preview.program_code && (
                <div>
                  <span className="text-muted-foreground">Program: </span>
                  <span className="font-medium">{preview.program_code}</span>
                </div>
              )}
              {preview.expires_at && (
                <div>
                  <span className="text-muted-foreground">Invitation Expires: </span>
                  <span className="font-medium">
                    {new Date(preview.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleAccept} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="password">Create Password</Label>
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {actionError && (
                <Alert variant="destructive">
                  <AlertIcon />
                  <AlertDescription>{actionError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={submitting} className="w-full mt-2">
                {submitting ? 'Activating account…' : 'Activate Account'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={handleDecline}
                className="w-full text-xs text-destructive hover:bg-destructive/10"
              >
                Decline Invitation
              </Button>
            </form>
          </div>
        ) : null}
      </Panel>
    </AuthLayout>
  )
}
