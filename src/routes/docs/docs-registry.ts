import apiDocumentationRaw from '../../../docs/api-documentation.md?raw'
import canonicalOpenApiSpecUrl from '../../../contract/openapi.yaml?url'
import {
  extractMarkdownSections,
  parseMarkdownBlocks,
  type MarkdownBlock,
  type MarkdownSectionHeading,
} from '@/routes/docs/markdown-blocks'

export interface AllowlistedDocEntry {
  readonly slug: string
  readonly title: string
  readonly category: string
  readonly summary: string
  readonly sourcePath: string
  readonly blocks: readonly MarkdownBlock[]
  readonly sections: readonly MarkdownSectionHeading[]
}

const apiDocBlocks = parseMarkdownBlocks(apiDocumentationRaw)

/**
 * Canonical URL to `contract/openapi.yaml` resolved directly by Vite (`?url`).
 * - In `npm run dev`, serves `contract/openapi.yaml` live from disk.
 * - In `npm run build`, emits a content-hashed asset under `dist/assets/`.
 * Never copies or duplicates `contract/openapi.yaml` in source control.
 */
export const CANONICAL_OPENAPI_SPEC_URL: string = canonicalOpenApiSpecUrl

/**
 * Explicit allowlist of repository guides published at `/docs`.
 * Never replace this with wildcard `import.meta.glob` over `docs/`, so private
 * artifacts (such as `docs/meeting-minutes/*`) are never bundled into the SPA.
 */
export const ALLOWLISTED_DOCS: readonly AllowlistedDocEntry[] = [
  {
    slug: 'api-documentation',
    title: 'API & Developer Documentation Guide',
    category: 'Contract & CI',
    summary:
      'How SAAIS serves canonical OpenAPI 3.1 documentation in-app (/docs, /docs/openapi) and publishes the static Redoc artifact in CI.',
    sourcePath: 'docs/api-documentation.md',
    blocks: apiDocBlocks,
    sections: extractMarkdownSections(apiDocBlocks),
  },
]
