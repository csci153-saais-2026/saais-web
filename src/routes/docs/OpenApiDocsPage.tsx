import * as React from 'react'
import { Link } from 'react-router'
import { Panel } from '@/components/features/panel'
import { AlertIcon, DownloadIcon } from '@/components/icons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import { DocsAuthGate } from '@/routes/docs/DocsAuthGate'
import { DocsShell } from '@/routes/docs/DocsShell'
import type { SessionCheckFn } from '@/routes/docs/docs-auth'
import { CANONICAL_OPENAPI_SPEC_URL } from '@/routes/docs/docs-registry'
import {
  mountRedocStandalone,
  type MountRedocOptions,
} from '@/routes/docs/redoc-loader'

export type MountRedocFn = (options: MountRedocOptions) => Promise<void>

export interface OpenApiDocsPageProps {
  readonly isDev?: boolean
  readonly checkAuthenticated?: SessionCheckFn
  readonly specUrl?: string
  readonly mountRedoc?: MountRedocFn
}

type ViewerStatus =
  | { readonly status: 'loading' }
  | { readonly status: 'ready' }
  | { readonly status: 'error'; readonly message: string }

function OpenApiContractViewer({
  specUrl = CANONICAL_OPENAPI_SPEC_URL,
  mountRedoc = mountRedocStandalone,
}: {
  readonly specUrl?: string
  readonly mountRedoc?: MountRedocFn
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [viewerState, setViewerState] = React.useState<ViewerStatus>({
    status: 'loading',
  })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const controller = new AbortController()
    let cancelled = false

    void mountRedoc({
      specUrl,
      container,
      signal: controller.signal,
    })
      .then(() => {
        if (!cancelled && !controller.signal.aborted) {
          setViewerState({ status: 'ready' })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && !controller.signal.aborted) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to render the canonical OpenAPI contract.'
          setViewerState({ status: 'error', message })
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [attempt, mountRedoc, specUrl])

  const handleRetry = () => {
    setViewerState({ status: 'loading' })
    setAttempt((prev) => prev + 1)
  }

  return (
    <DocsShell
      flush
      crumbs={[
        { label: 'Documentation', to: '/docs' },
        { label: 'OpenAPI Contract' },
      ]}
      topbarTrailing={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="current" className="hidden sm:inline-flex">
            OpenAPI 3.1 · v0.3.0
          </StatusBadge>
          <code className="hidden rounded-sm bg-secondary px-2 py-0.5 font-mono text-caption text-muted-2 lg:inline-block">
            contract/openapi.yaml
          </code>
          <Button variant="outline" size="sm" asChild>
            <a href={specUrl} download="saais-openapi.yaml">
              <DownloadIcon />
              Download YAML
            </a>
          </Button>
        </div>
      }
    >
      {viewerState.status === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-5xl space-y-5 px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)"
        >
          <p className="text-body text-muted-foreground">
            Loading canonical OpenAPI 3.1 contract…
          </p>
          <div className="grid gap-grid md:grid-cols-[250px_1fr]">
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-5/6" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      )}

      {viewerState.status === 'error' && (
        <div className="max-w-2xl px-gutter-sm pt-6 pb-10 md:px-gutter md:pt-(--content-pad-top) md:pb-(--content-pad-bottom)">
          <Panel
            title="Contract viewer unavailable"
            description="The interactive Redoc renderer could not initialize from contract/openapi.yaml."
          >
            <Alert variant="destructive">
              <AlertIcon />
              <AlertTitle>Failed to load API documentation</AlertTitle>
              <AlertDescription>{viewerState.message}</AlertDescription>
            </Alert>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button type="button" onClick={handleRetry}>
                Retry loading contract
              </Button>
              <Button variant="outline" asChild>
                <a href={specUrl} target="_blank" rel="noreferrer">
                  Open raw openapi.yaml
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/docs">Back to documentation hub</Link>
              </Button>
            </div>
          </Panel>
        </div>
      )}

      <div
        ref={containerRef}
        data-testid="redoc-container"
        className={cn(
          'min-h-[calc(100dvh-var(--topbar-height))] bg-card',
          viewerState.status !== 'ready' &&
            'pointer-events-none h-0 min-h-0 overflow-hidden opacity-0',
        )}
      />
    </DocsShell>
  )
}

/** Lazy-loaded `/docs/openapi` Redoc route protected outside development by `DocsAuthGate`. */
export default function OpenApiDocsPage({
  isDev,
  checkAuthenticated,
  specUrl,
  mountRedoc,
}: OpenApiDocsPageProps = {}) {
  return (
    <DocsAuthGate isDev={isDev} checkAuthenticated={checkAuthenticated}>
      <OpenApiContractViewer specUrl={specUrl} mountRedoc={mountRedoc} />
    </DocsAuthGate>
  )
}
