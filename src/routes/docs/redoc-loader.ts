export const REDOC_STANDALONE_SRC =
  'https://cdn.redocly.com/redoc/v2.5.3/bundles/redoc.standalone.js'

export const REDOC_STANDALONE_INTEGRITY =
  'sha384-xiEssMQFSpSfLbzRZCGfxxIM5QDb2DTrU6vyoZdp2sV1L6pmOMy6MpTtUoLbpC96'

export interface RedocStandaloneGlobal {
  init(
    specOrSpecUrl: string | Record<string, unknown>,
    options: Record<string, unknown>,
    element: HTMLElement,
    callback?: (error?: Error) => void,
  ): void
}

interface WindowWithRedoc extends Window {
  Redoc?: RedocStandaloneGlobal
}

export interface MountRedocOptions {
  readonly specUrl: string
  readonly container: HTMLElement
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
  readonly loadScript?: () => Promise<RedocStandaloneGlobal>
}

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

let inFlightScriptPromise: Promise<RedocStandaloneGlobal> | null = null

function getGlobalRedoc(): RedocStandaloneGlobal | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as WindowWithRedoc).Redoc
}

/** Resets cached script-loader state between unit tests. */
export function resetRedocLoaderForTests(): void {
  inFlightScriptPromise = null
}

/**
 * Dynamically injects Redoc's official standalone bundle with Subresource Integrity (SRI),
 * deduplicating concurrent loads and cleaning up failed script tags so retries succeed.
 */
export function loadRedocStandaloneScript(
  doc: Document = document,
): Promise<RedocStandaloneGlobal> {
  const existing = getGlobalRedoc()
  if (existing && typeof existing.init === 'function') {
    return Promise.resolve(existing)
  }

  if (inFlightScriptPromise) {
    return inFlightScriptPromise
  }

  inFlightScriptPromise = new Promise<RedocStandaloneGlobal>((resolve, reject) => {
    const script = doc.createElement('script')
    script.src = REDOC_STANDALONE_SRC
    script.integrity = REDOC_STANDALONE_INTEGRITY
    script.crossOrigin = 'anonymous'
    script.async = true
    script.dataset.saaisRedoc = 'standalone'

    script.onload = () => {
      const loaded = getGlobalRedoc()
      if (loaded && typeof loaded.init === 'function') {
        resolve(loaded)
      } else {
        inFlightScriptPromise = null
        script.remove()
        reject(
          new Error(
            'Redoc standalone script loaded, but window.Redoc.init is unavailable.',
          ),
        )
      }
    }

    script.onerror = () => {
      inFlightScriptPromise = null
      script.remove()
      reject(
        new Error(
          'Unable to load the Redoc renderer script. Check your network connection and retry.',
        ),
      )
    }

    doc.head.appendChild(script)
  })

  return inFlightScriptPromise
}

/**
 * Verifies the canonical OpenAPI YAML asset is reachable and mounts Redoc into `container`.
 */
export async function mountRedocStandalone({
  specUrl,
  container,
  signal,
  fetchImpl = fetch,
  loadScript = () => loadRedocStandaloneScript(),
}: MountRedocOptions): Promise<void> {
  const response = await fetchImpl(specUrl, {
    method: 'GET',
    signal,
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch canonical OpenAPI contract (${response.status} ${response.statusText || 'Error'}).`,
    )
  }

  const rawYaml = await response.text()
  if (rawYaml.trim().length === 0) {
    throw new Error('Canonical OpenAPI contract asset is empty.')
  }

  if (signal?.aborted) return

  const redoc = await loadScript()
  if (signal?.aborted) return

  container.replaceChildren()
  const redocOptions = buildSaaisRedocOptions()

  await new Promise<void>((resolve, reject) => {
    try {
      redoc.init(specUrl, redocOptions, container, (err?: Error) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error('Failed to initialize Redoc viewer.'),
      )
    }
  })
}
