import * as React from 'react'
import { Link } from 'react-router'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { QuickAccess } from '@/components/features/quick-access'
import { SampleFooter } from '@/components/features/sample-footer'
import { BookIcon, DownloadIcon, GridIcon, ShieldIcon } from '@/components/icons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { DocsAuthGate } from '@/routes/docs/DocsAuthGate'
import { DocsShell } from '@/routes/docs/DocsShell'
import type { SessionCheckFn } from '@/routes/docs/docs-auth'
import {
  ALLOWLISTED_DOCS,
  loadGuide,
  fetchDocumentation,
  type AllowlistedDocEntry,
} from '@/routes/docs/docs-registry'
import { MarkdownDocumentView } from '@/routes/docs/MarkdownDocumentView'

export interface DocsHubPageProps {
  readonly isDev?: boolean
  readonly checkAuthenticated?: SessionCheckFn
}

const HUB_QUICK_LINKS = [
  { label: 'OpenAPI 3.1 contract', to: '/docs/openapi' },
  { label: 'Style guide & tokens', to: '/styleguide' },
]

function DocsHubContent() {
  const [docs, setDocs] = React.useState<readonly AllowlistedDocEntry[]>(ALLOWLISTED_DOCS)
  const [error, setError] = React.useState('')
  React.useEffect(() => {
    const controller = new AbortController()
    void loadGuide(controller.signal).then(doc => setDocs([doc])).catch(() => { if (!controller.signal.aborted) setError('The guide could not be loaded.') })
    return () => controller.abort()
  }, [])
  const allGuideSections = docs.flatMap((doc) => doc.sections)
  async function downloadSpec() {
    try {
      const content = await fetchDocumentation('openapi')
      const url = URL.createObjectURL(new Blob([content], { type: 'application/yaml' }))
      const link = document.createElement('a'); link.href = url; link.download = 'saais-openapi.yaml'; link.click()
      URL.revokeObjectURL(url)
    } catch { setError('The OpenAPI document could not be downloaded.') }
  }

  return (
    <DocsShell
      crumbs={[{ label: 'Documentation' }]}
      guideSections={allGuideSections}
      topbarTrailing={
        <StatusBadge status="current">OpenAPI 3.1 · v0.3.0</StatusBadge>
      }
    >
      <PageHeading
        title="Documentation"
        subtitle="Canonical API contract reference and explicitly allowlisted engineering guides for SAAIS."
        actions={
          <Button asChild>
            <Link to="/docs/openapi">
              <BookIcon />
              Open API Reference
            </Link>
          </Button>
        }
      />

      <QuickAccess links={HUB_QUICK_LINKS} />

      <div className="mb-6 grid gap-grid lg:grid-cols-2">
        <Panel
          title="OpenAPI 3.1 Contract Reference"
          description="Interactive Redoc explorer bound directly to canonical contract/openapi.yaml (v0.3.0)."
          action={<StatusBadge status="active">Canonical</StatusBadge>}
          className="mb-0"
        >
          <p className="mb-4 text-body text-muted-foreground">
            Browse all PostgREST read projections, transactional Edge Functions, role matrices,
            and error payloads with zero schema copy drift.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link to="/docs/openapi">
                <BookIcon />
                Explore OpenAPI Contract
              </Link>
            </Button>
            <Button variant="outline" onClick={downloadSpec}><DownloadIcon />Download openapi.yaml</Button>
          </div>
        </Panel>

        <Panel
          title="Design System & UI Style Guide"
          description="Live tokens, status badges, typography scale, and shared components from src/components."
          action={
            <code className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-caption text-muted-2">
              src/components
            </code>
          }
          className="mb-0"
        >
          <p className="mb-4 text-body text-muted-foreground">
            Inspect SAAIS forest, gold, and cream color tokens alongside accessible shadcn/ui and
            feature-level building blocks.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" asChild>
              <Link to="/styleguide">
                <GridIcon />
                Open Style Guide
              </Link>
            </Button>
          </div>
        </Panel>
      </div>

      <Alert variant="advisory" className="mb-6">
        <ShieldIcon />
        <AlertTitle>Explicit documentation allowlist</AlertTitle>
        <AlertDescription>
          Only curated guides registered in{' '}
          <code className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-caption text-foreground">
            src/routes/docs/docs-registry.ts
          </code>{' '}
          are rendered here. Internal repository files (such as meeting minutes) are excluded from
          the client bundle.
        </AlertDescription>
      </Alert>

      {error && <p role="alert">{error}</p>}
      {docs.map((doc) => (
        <Panel
          key={doc.slug}
          title={doc.title}
          description={doc.summary}
          action={
            <code className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-caption text-muted-2">
              {doc.sourcePath}
            </code>
          }
        >
          <MarkdownDocumentView blocks={doc.blocks} />
        </Panel>
      ))}

      <SampleFooter>
        Canonical contract: contract/openapi.yaml · CI static bundle: docs/openapi/index.html
      </SampleFooter>
    </DocsShell>
  )
}

/** Lazy-loaded `/docs` route protected outside development by `DocsAuthGate`. */
export default function DocsHubPage({
  isDev,
  checkAuthenticated,
}: DocsHubPageProps = {}) {
  return (
    <DocsAuthGate isDev={isDev} checkAuthenticated={checkAuthenticated}>
      <DocsHubContent />
    </DocsAuthGate>
  )
}
