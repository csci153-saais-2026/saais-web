import { getSupabaseClient, resetSupabaseClientForTests } from '@/lib/supabase/client'
import { parseMarkdownBlocks } from '@/routes/docs/markdown-blocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { setAccessTokenResolver, setMockSessionToken } from '@/lib/api'
import App from '@/App'
import DocsHubPage from '@/routes/docs/DocsHubPage'
import OpenApiDocsPage, {
  type MountRedocFn,
} from '@/routes/docs/OpenApiDocsPage'
import { checkDocsSessionAuthenticated } from '@/routes/docs/docs-auth'
import {
  ALLOWLISTED_DOCS,
  CANONICAL_OPENAPI_SPEC_URL,
} from '@/routes/docs/docs-registry'
import {
  buildSaaisRedocOptions,
  loadRedocStandaloneScript,
  mountRedocStandalone,
  REDOC_STANDALONE_INTEGRITY,
  REDOC_STANDALONE_SRC,
  resetRedocLoaderForTests,
  SAAIS_REDOC_OPTIONS,
} from '@/routes/docs/redoc-loader'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  resetSupabaseClientForTests()
  setMockSessionToken(null)
  setAccessTokenResolver(null)
  resetRedocLoaderForTests()
  delete (window as unknown as Record<string, unknown>).Redoc
  document
    .querySelectorAll('script[data-saais-redoc="standalone"]')
    .forEach((el) => el.remove())
})

describe('docs-registry canonical & allowlist guarantees', () => {
  it('consumes unsupported lines, respects fence lengths, and preserves nested lists', () => {
    const blocks = parseMarkdownBlocks('#### Troubleshooting\n#hashtag\n| not a table\n\n````js\n```\n```suffix\ncode\n````\n\n1. Parent\n   - Child\n   - Another\n2. Next')
    expect(blocks[0].kind).toBe('paragraph')
    const code = blocks.find(b => b.kind === 'code')
    expect(code?.kind === 'code' && code.code).toBe('```\n```suffix\ncode')
    const list = blocks.find(b => b.kind === 'list')
    expect(list?.kind === 'list' && list.items[0].children[0].items).toHaveLength(2)
  })

  it('resolves canonical contract/openapi.yaml URL directly and excludes meeting minutes', () => {
    expect(CANONICAL_OPENAPI_SPEC_URL).toContain('openapi')
    expect(ALLOWLISTED_DOCS.length).toBeGreaterThan(0)
    expect(ALLOWLISTED_DOCS.map((d) => d.sourcePath)).toEqual([
      'docs/api-documentation.md',
    ])
    for (const doc of ALLOWLISTED_DOCS) {
      expect(doc.sourcePath.includes('meeting-minutes')).toBe(false)
      expect(doc.blocks.length).toBeGreaterThan(5)
      expect(doc.sections.length).toBeGreaterThan(2)
    }
  })
})

describe('DocsAuthGate & session policy', () => {
  it('hides docs when the Supabase session signs out', async () => {
    vi.stubEnv('VITE_API_MODE', 'supabase')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    const sdk = getSupabaseClient()
    const callback: { current?: (event: string) => void } = {}
    vi.spyOn(sdk.auth, 'onAuthStateChange').mockImplementation((handler) => {
      callback.current = (event) => { void handler(event as 'SIGNED_OUT', null) }
      return { data: { subscription: { id: 'test', callback: handler, unsubscribe: vi.fn() } } }
    })
    render(<MemoryRouter><DocsHubPage isDev={false} checkAuthenticated={async () => true} /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Documentation' })
    expect(callback.current).toBeDefined()
    callback.current?.('SIGNED_OUT')
    await screen.findByText('Active session not found')
  })

  it('rechecks the session when the window regains focus', async () => {
    let active = true
    render(<MemoryRouter><DocsHubPage isDev={false} checkAuthenticated={async () => active} /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Documentation' })
    active = false
    fireEvent.focus(window)
    await screen.findByText('Active session not found')
  })

  it('allows unauthenticated access in development mode (isDev=true)', () => {
    render(
      <MemoryRouter initialEntries={['/docs']}>
        <DocsHubPage isDev={true} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Documentation' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Open API Reference/i }).getAttribute('href'),
    ).toBe('/docs/openapi')
    expect(
      screen.getByRole('link', { name: /Open Style Guide/i }).getAttribute('href'),
    ).toBe('/styleguide')
    expect(screen.getByLabelText('Quick Access')).toBeTruthy()
    expect(document.querySelector('[data-slot="sidebar"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="status-badge"]')).toBeTruthy()
    expect(document.querySelector('table.stack-table td[data-label="Artifact"]')).toBeTruthy()
  })

  it('blocks unauthenticated access outside development (isDev=false) using real token resolver', async () => {
    setMockSessionToken(null)

    render(
      <MemoryRouter initialEntries={['/docs']}>
        <DocsHubPage isDev={false} />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Authentication required' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Sign in' }).getAttribute('href'),
    ).toBe('/login')
    expect(screen.queryByRole('heading', { name: 'Documentation' })).toBeNull()
  })

  it('grants access outside development (isDev=false) when an active session token exists', async () => {
    setMockSessionToken('mock-jwt:adviser:adv-001')
    expect(await checkDocsSessionAuthenticated()).toBe(true)

    render(
      <MemoryRouter initialEntries={['/docs']}>
        <DocsHubPage isDev={false} />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Documentation' }),
    ).toBeTruthy()
    expect(
      screen.getAllByText('openapi-redoc-bundle').length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('treats rejected session lookups safely as unauthenticated', async () => {
    setAccessTokenResolver(() => Promise.reject(new Error('storage unavailable')))
    expect(await checkDocsSessionAuthenticated()).toBe(false)

    render(
      <MemoryRouter initialEntries={['/docs']}>
        <DocsHubPage
          isDev={false}
          checkAuthenticated={() => Promise.reject(new Error('auth error'))}
        />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Authentication required' }),
    ).toBeTruthy()
  })
})

describe('OpenApiDocsPage (/docs/openapi)', () => {
  it('displays loading state and mounts Redoc with canonical spec URL', async () => {
    let resolveMount!: () => void
    const mountRedoc = vi.fn<MountRedocFn>(
      () =>
        new Promise<void>((resolve) => {
          resolveMount = resolve
        }),
    )

    render(
      <MemoryRouter initialEntries={['/docs/openapi']}>
        <OpenApiDocsPage isDev={true} mountRedoc={mountRedoc} />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Loading canonical OpenAPI 3.1 contract…'),
    ).toBeTruthy()
    expect(mountRedoc).toHaveBeenCalledTimes(1)
    expect(mountRedoc.mock.calls[0]?.[0]?.specUrl).toBe(
      CANONICAL_OPENAPI_SPEC_URL,
    )

    resolveMount()

    await waitFor(() => {
      expect(
        screen.queryByText('Loading canonical OpenAPI 3.1 contract…'),
      ).toBeNull()
    })
    expect(
      screen.getByTestId('redoc-container').className.includes('opacity-0'),
    ).toBe(false)
  })

  it('renders destructive alert on mount failure and recovers when Retry is clicked', async () => {
    const mountRedoc = vi
      .fn<MountRedocFn>()
      .mockRejectedValueOnce(new Error('Redoc CDN unreachable'))
      .mockImplementationOnce(async ({ container }) => {
        const marker = document.createElement('div')
        marker.textContent = 'SAAIS OpenAPI Mounted'
        container.appendChild(marker)
      })

    render(
      <MemoryRouter initialEntries={['/docs/openapi']}>
        <OpenApiDocsPage isDev={true} mountRedoc={mountRedoc} />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Failed to load API documentation'),
    ).toBeTruthy()
    expect(screen.getByText('Redoc CDN unreachable')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Retry loading contract' }),
    )

    expect(await screen.findByText('SAAIS OpenAPI Mounted')).toBeTruthy()
    expect(mountRedoc).toHaveBeenCalledTimes(2)
  })

  it('does not invoke mountRedoc when unauthenticated outside development', async () => {
    const mountRedoc = vi.fn().mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/docs/openapi']}>
        <OpenApiDocsPage
          isDev={false}
          checkAuthenticated={async () => false}
          mountRedoc={mountRedoc}
        />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Authentication required' }),
    ).toBeTruthy()
    expect(mountRedoc).not.toHaveBeenCalled()
  })
})

describe('redoc-loader standalone script & spec verification', () => {
  it('fails fast with HTTP status when canonical spec URL cannot be fetched', async () => {
    const container = document.createElement('div')
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    )

    await expect(
      mountRedocStandalone({
        specUrl: '/assets/openapi.yaml',
        container,
        fetchImpl,
      }),
    ).rejects.toThrow('Failed to fetch canonical OpenAPI contract (404 Not Found).')
  })

  it('fails when canonical spec asset is empty', async () => {
    const container = document.createElement('div')
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('   ', { status: 200 }),
    )

    await expect(
      mountRedocStandalone({
        specUrl: '/assets/openapi.yaml',
        container,
        fetchImpl,
      }),
    ).rejects.toThrow('Canonical OpenAPI contract asset is empty.')
  })

  it('initializes Redoc with SAAIS theme options when spec and script succeed', async () => {
    const container = document.createElement('div')
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('openapi: 3.1.0\ninfo:\n  title: SAAIS\n  version: 0.3.0\n', {
        status: 200,
      }),
    )
    const initSpy = vi.fn(
      (
        _specUrl: string | Record<string, unknown>,
        _options: Record<string, unknown>,
        target: HTMLElement,
        cb?: (err?: Error) => void,
      ) => {
        target.dataset.mounted = 'true'
        cb?.()
      },
    )

    await mountRedocStandalone({
      specUrl: '/assets/openapi.yaml',
      container,
      fetchImpl,
      loadScript: async () => ({ init: initSpy }),
    })

    expect(initSpy).toHaveBeenCalledTimes(1)
    expect(initSpy.mock.calls[0]?.[0]).toBe('/assets/openapi.yaml')
    expect(initSpy.mock.calls[0]?.[1]).toEqual(SAAIS_REDOC_OPTIONS)
    expect(container.dataset.mounted).toBe('true')
  })

  it('injects SRI-pinned script tag and recovers cleanly after a script load failure', async () => {
    const firstAttempt = loadRedocStandaloneScript(document)
    const injectedScript = document.querySelector<HTMLScriptElement>(
      'script[data-saais-redoc="standalone"]',
    )
    expect(injectedScript).toBeTruthy()
    expect(injectedScript?.src).toBe(REDOC_STANDALONE_SRC)
    expect(injectedScript?.integrity).toBe(REDOC_STANDALONE_INTEGRITY)
    expect(injectedScript?.crossOrigin).toBe('anonymous')

    injectedScript?.onerror?.(new Event('error'))
    await expect(firstAttempt).rejects.toThrow(
      'Unable to load the Redoc renderer script',
    )

    // Retry after failure should inject a fresh script element and resolve once window.Redoc exists
    const secondAttempt = loadRedocStandaloneScript(document)
    const retryScript = document.querySelector<HTMLScriptElement>(
      'script[data-saais-redoc="standalone"]',
    )
    expect(retryScript).toBeTruthy()
    ;(window as unknown as Record<string, unknown>).Redoc = {
      init: vi.fn(),
    }
    retryScript?.onload?.(new Event('load'))

    const loadedRedoc = await secondAttempt
    expect(typeof loadedRedoc.init).toBe('function')
  })

  it('reads SAAIS CSS custom properties from :root when building Redoc options', () => {
    document.documentElement.style.setProperty('--primary', '#2f4a12')
    document.documentElement.style.setProperty('--muted-foreground', '#6e6c58')
    const options = buildSaaisRedocOptions() as {
      theme: { colors: { primary: { main: string }; text: { secondary: string } } }
    }
    expect(options.theme.colors.primary.main).toBe('#2f4a12')
    expect(options.theme.colors.text.secondary).toBe('#6e6c58')
    document.documentElement.style.removeProperty('--primary')
    document.documentElement.style.removeProperty('--muted-foreground')
  })
})

describe('App lazy-loaded /docs route integration', () => {
  it('resolves /docs lazily through App BrowserRouter and Suspense', async () => {
    window.history.pushState({}, '', '/docs')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Documentation' }),
    ).toBeTruthy()
    window.history.pushState({}, '', '/')
  })
})
