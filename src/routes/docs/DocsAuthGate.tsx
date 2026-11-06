import * as React from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/components/features/auth-layout'
import { Panel } from '@/components/features/panel'
import { BookIcon, LockIcon, ShieldIcon } from '@/components/icons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  checkDocsSessionAuthenticated,
  type SessionCheckFn,
} from '@/routes/docs/docs-auth'

export interface DocsAuthGateProps {
  readonly children: React.ReactNode
  readonly isDev?: boolean
  readonly checkAuthenticated?: SessionCheckFn
}

const DOCS_AUTH_BULLETS = [
  {
    icon: <BookIcon className="size-4" />,
    text: 'Open without sign-in during local Vite development (npm run dev).',
  },
  {
    icon: <LockIcon className="size-4" />,
    text: 'Requires an active authenticated SAAIS session in deployed builds.',
  },
  {
    icon: <ShieldIcon className="size-4" />,
    text: 'Renders directly from canonical contract/openapi.yaml with zero copy drift.',
  },
]

/**
 * Enforces the SAAIS documentation access policy:
 * - Open without sign-in during local development (`import.meta.env.DEV`).
 * - Requires an active authenticated session in deployed/production builds.
 */
export function DocsAuthGate({
  children,
  isDev = import.meta.env.DEV,
  checkAuthenticated = checkDocsSessionAuthenticated,
}: DocsAuthGateProps) {
  const [status, setStatus] = React.useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >(() => (isDev ? 'authenticated' : 'checking'))

  React.useEffect(() => {
    if (isDev) return

    let cancelled = false

    void Promise.resolve()
      .then(() => checkAuthenticated())
      .then((authenticated) => {
        if (!cancelled) {
          setStatus(authenticated ? 'authenticated' : 'unauthenticated')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('unauthenticated')
        }
      })

    return () => {
      cancelled = true
    }
  }, [isDev, checkAuthenticated])

  if (isDev || status === 'authenticated') {
    return <>{children}</>
  }

  if (status === 'checking') {
    return (
      <main
        role="status"
        aria-live="polite"
        className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-grid px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)"
      >
        <span className="sr-only">Verifying documentation session…</span>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-28 w-full" />
      </main>
    )
  }

  return (
    <AuthLayout
      kicker="Developer documentation"
      headline="Authentication required"
      bullets={DOCS_AUTH_BULLETS}
    >
      <Panel
        title="Sign in to view documentation"
        description="Deployed environments restrict API contract and developer guides to authenticated SAAIS sessions."
        className="mb-0"
      >
        <Alert variant="advisory">
          <LockIcon />
          <AlertTitle>Active session not found</AlertTitle>
          <AlertDescription>
            Sign in with an authorized SAAIS account to inspect the OpenAPI 3.1 contract or curated
            developer guides.
          </AlertDescription>
        </Alert>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </Panel>
    </AuthLayout>
  )
}
