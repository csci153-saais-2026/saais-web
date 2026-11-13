import * as React from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/components/features/auth-layout'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon, CheckIcon } from '@/components/icons'
import { requestPasswordRecoveryEmail } from '@/lib/auth/auth-service'

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await requestPasswordRecoveryEmail(email)
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to send password recovery email.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      kicker="Visayas State University"
      headline="Password Recovery"
      bullets={[
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Request an institutional password reset link',
        },
        {
          icon: <CheckIcon className="w-4 h-4" />,
          text: 'Verify your account credentials safely',
        },
      ]}
    >
      <Panel title="Reset Password" description="Enter your institutional email.">
        {sent ? (
          <div className="grid gap-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckIcon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Recovery Email Sent</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for{' '}
              <span className="font-semibold text-foreground">{email.trim()}</span>, a password
              reset link has been dispatched to your institutional inbox.
            </p>
            <Link to="/login" className="w-full mt-2">
              <Button variant="outline" className="w-full">
                Return to Sign in
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <h2 className="text-2xl font-bold">Forgot your password?</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your institutional email address to receive password reset instructions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Institutional email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@vsu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={submitting} className="w-full mt-2">
                {submitting ? 'Sending instructions…' : 'Send Recovery Email'}
              </Button>

              <div className="text-center mt-1">
                <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
                  Back to Sign in
                </Link>
              </div>
            </form>
          </div>
        )}
      </Panel>
    </AuthLayout>
  )
}
