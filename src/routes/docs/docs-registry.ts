import { resolveCurrentAccessToken } from '@/lib/api'
import { extractMarkdownSections, parseMarkdownBlocks, type MarkdownBlock, type MarkdownSectionHeading } from '@/routes/docs/markdown-blocks'

export interface AllowlistedDocEntry {
  readonly slug: string
  readonly title: string
  readonly category: string
  readonly summary: string
  readonly sourcePath: string
  readonly blocks: readonly MarkdownBlock[]
  readonly sections: readonly MarkdownSectionHeading[]
}

export const CANONICAL_OPENAPI_SPEC_URL = '/api/docs?document=openapi'
export const ALLOWLISTED_DOCS: readonly AllowlistedDocEntry[] = [{
  slug: 'api-documentation', title: 'API & Developer Documentation Guide', category: 'Contract & CI',
  summary: 'How SAAIS serves and publishes API documentation.', sourcePath: 'docs/api-documentation.md', blocks: [], sections: [],
}]

export async function fetchDocumentation(document: 'openapi' | 'guide', signal?: AbortSignal): Promise<string> {
  if (import.meta.env.DEV) {
    return document === 'openapi'
      ? (await import('../../../contract/openapi.yaml?raw')).default
      : (await import('../../../docs/api-documentation.md?raw')).default
  }
  const token = await resolveCurrentAccessToken()
  if (!token) throw new Error('An active session is required to load documentation.')
  const response = await fetch(`/api/docs?document=${document}`, { headers: { Authorization: `Bearer ${token}` }, signal })
  if (!response.ok) throw new Error(`Documentation request failed (${response.status}).`)
  const type = response.headers.get('Content-Type') || ''
  const expected = document === 'openapi' ? 'application/yaml' : 'text/markdown'
  if (!type.toLowerCase().startsWith(expected)) throw new Error('Documentation endpoint returned an unexpected response.')
  return response.text()
}

export async function loadGuide(signal?: AbortSignal): Promise<AllowlistedDocEntry> {
  const blocks = parseMarkdownBlocks(await fetchDocumentation('guide', signal))
  return { ...ALLOWLISTED_DOCS[0], blocks, sections: extractMarkdownSections(blocks) }
}
