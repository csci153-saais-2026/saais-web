import * as React from 'react'
import { useNavigate } from 'react-router'
import { AuthLayout } from '@/components/features/auth-layout'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: authError } = await getSupabaseClient('supabase').auth.signInWithPassword({ email: email.trim(), password })
      if (authError) throw authError
      navigate('/docs', { replace: true })
    } catch {
      setError('Unable to sign in. Check your credentials and try again.')
    } finally {
      setBusy(false)
    }
  }

  return <AuthLayout kicker="SAAIS" headline="Sign in to your account" bullets={[]}>
    <Panel title="Sign in" description="Use your institutional account to continue.">
      <form onSubmit={signIn} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">Institutional email<Input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label className="grid gap-1.5 text-sm">Password<Input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </Panel>
  </AuthLayout>
}
