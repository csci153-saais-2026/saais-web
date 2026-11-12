import { fetchDocumentation } from '@/routes/docs/docs-registry'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

export interface MountRedocOptions {
  readonly specUrl: string
  readonly container: HTMLElement
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
}

export type RedocCleanup = () => void

function readRootCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback
  }
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value.length > 0 ? value : fallback
}

/**
 * Builds Redoc options directly from SAAIS design tokens in `src/index.css` (`:root`),
 * falling back to the exact prototype design-sheet values in headless/test environments.
 */
export function buildSaaisRedocOptions(): Record<string, unknown> {
  const primary = readRootCssVar('--primary', '#2f4a12')
  const foreground = readRootCssVar('--foreground', '#16200c')
  const mutedForeground = readRootCssVar('--muted-foreground', '#6e6c58')
  const secondary = readRootCssVar('--secondary', '#f2eddc')
  const forestDeep = readRootCssVar('--forest-deep', '#1d2f0a')
  const cream = readRootCssVar('--background', '#fbf8ef')
  const link = readRootCssVar('--link', '#2f4a12')
  const linkHover = readRootCssVar('--link-hover', '#b0761a')
  const statusPass = readRootCssVar('--status-pass', '#2c6430')
  const statusEnrolled = readRootCssVar('--status-enrolled', '#2a4c6b')
  const statusInc = readRootCssVar('--status-inc', '#8a6206')
  const statusFail = readRootCssVar('--status-fail', '#9e2e1c')

  return {
    hideDownloadButton: false,
    nativeScrollbars: true,
    pathInMiddlePanel: true,
    requiredPropsFirst: true,
    sortPropsAlphabetically: false,
    theme: {
      colors: {
        primary: { main: primary },
        text: { primary: foreground, secondary: mutedForeground },
        http: {
          get: statusPass,
          post: statusEnrolled,
          put: statusInc,
          patch: statusInc,
          delete: statusFail,
        },
      },
      sidebar: {
        backgroundColor: secondary,
        textColor: foreground,
        activeTextColor: primary,
        width: '250px',
      },
      rightPanel: {
        backgroundColor: forestDeep,
        textColor: cream,
      },
      typography: {
        fontSize: '15px',
        lineHeight: '1.55',
        fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
        headings: {
          fontFamily: '"Syne Variable", "Segoe UI", system-ui, sans-serif',
          fontWeight: '700',
        },
        code: {
          fontSize: '14px',
          fontFamily: '"IBM Plex Mono", ui-monospace, Consolas, monospace',
        },
        links: {
          color: link,
          visited: link,
          hover: linkHover,
        },
      },
    },
  }
}

export const SAAIS_REDOC_OPTIONS: Record<string, unknown> =
  buildSaaisRedocOptions()

/** Loads the protected contract and owns the React root used by Redoc. */
export async function mountRedocStandalone({
  specUrl, container, signal, fetchImpl = fetch,
}: MountRedocOptions): Promise<RedocCleanup> {
  const rawYaml = specUrl === '/api/docs?document=openapi'
    ? await fetchDocumentation('openapi', signal)
    : await (async () => {
        const response = await fetchImpl(specUrl, { method: 'GET', signal })
        if (!response.ok) throw new Error(`Failed to fetch canonical OpenAPI contract (${response.status} ${response.statusText || 'Error'}).`)
        return response.text()
      })()
  if (!rawYaml.trim()) throw new Error('Canonical OpenAPI contract asset is empty.')
  if (signal?.aborted) return () => {}
  const { RedocStandalone } = await import('redoc')
  if (signal?.aborted) return () => {}

  const element = document.createElement('div')
  container.appendChild(element)
  const root = createRoot(element)
  const objectUrl = URL.createObjectURL(new Blob([rawYaml], { type: 'application/yaml' }))
  let disposed = false
  const cleanup = () => {
    if (disposed) return
    disposed = true
    signal?.removeEventListener('abort', onAbort)
    URL.revokeObjectURL(objectUrl)
    // React may be completing the parent route's cleanup; unmount after that commit.
    queueMicrotask(() => { root.unmount(); element.remove() })
  }
  let rejectLoad: (error: Error) => void = () => {}
  const onAbort = () => { cleanup(); rejectLoad(new DOMException('Aborted', 'AbortError')) }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    await new Promise<void>((resolve, reject) => {
      rejectLoad = reject
      root.render(createElement(RedocStandalone, {
        specUrl: objectUrl,
        options: buildSaaisRedocOptions(),
        onLoaded: (error?: Error) => error ? reject(error) : resolve(),
      }))
    })
    if (signal?.aborted) cleanup()
    return cleanup
  } catch (error) {
    cleanup()
    throw error
  }
}
