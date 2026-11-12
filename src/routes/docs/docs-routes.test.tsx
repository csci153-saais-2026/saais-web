const redocLifecycle = vi.hoisted(() => ({ unmounted: vi.fn(), defer: false }))
vi.mock('redoc', async () => {
  const React = await import('react')
  return { RedocStandalone: ({ onLoaded }: { onLoaded: () => void }) => {
    React.useEffect(() => { if (!redocLifecycle.defer) onLoaded(); return redocLifecycle.unmounted }, [onLoaded])
    return React.createElement('div', { 'data-test-redoc': true })
  } }
})

import LoginPage from '@/routes/auth/LoginPage'
import { getSupabaseClient, resetSupabaseClientForTests } from '@/lib/supabase/client'
import { parseMarkdownBlocks } from '@/routes/docs/markdown-blocks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
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
  loadGuide,
  fetchDocumentation,
} from '@/routes/docs/docs-registry'
import {
  buildSaaisRedocOptions,
  mountRedocStandalone,
} from '@/routes/docs/redoc-loader'

afterEach(() => {
  cleanup()
  redocLifecycle.defer = false
  redocLifecycle.unmounted.mockClear()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetSupabaseClientForTests()
  setMockSessionToken(null)
  setAccessTokenResolver(null)
})

describe('docs-registry canonical & allowlist guarantees', () => {
  it('fetches production documents with a bearer token and rejects HTML fallbacks', async () => {
    vi.stubEnv('DEV', false)
    setAccessTokenResolver(() => 'real-session')
    const fetchMock = vi.fn().mockResolvedValue(new Response('openapi: 3.1.0', { headers: { 'Content-Type': 'application/yaml' } }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchDocumentation('openapi')).toBe('openapi: 3.1.0')
    expect(fetchMock).toHaveBeenCalledWith('/api/docs?document=openapi', expect.objectContaining({ headers: { Authorization: 'Bearer real-session' } }))
    fetchMock.mockResolvedValue(new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }))
    await expect(fetchDocumentation('openapi')).rejects.toThrow(/unexpected response/)
  })

  it('consumes unsupported lines, respects fence lengths, and preserves nested lists', () => {
    const blocks = parseMarkdownBlocks('#### Troubleshooting\n#hashtag\n| not a table\n\n````js\n```\n```suffix\ncode\n````\n\n1. Parent\n   - Child\n   - Another\n2. Next')
    expect(blocks[0].kind).toBe('paragraph')
    const code = blocks.find(b => b.kind === 'code')
    expect(code?.kind === 'code' && code.code).toBe('```\n```suffix\ncode')
    const list = blocks.find(b => b.kind === 'list')
    expect(list?.kind === 'list' && list.items[0].children[0].items).toHaveLength(2)
  })

  it('loads only the allowlisted guide', async () => {
    expect(CANONICAL_OPENAPI_SPEC_URL).toContain('openapi')
    expect(ALLOWLISTED_DOCS.length).toBeGreaterThan(0)
    expect(ALLOWLISTED_DOCS.map((d) => d.sourcePath)).toEqual([
      'docs/api-documentation.md',
    ])
    const doc = await loadGuide()
    expect(doc.sourcePath.includes('meeting-minutes')).toBe(false)
    expect(doc.blocks.length).toBeGreaterThan(5)
    expect(doc.sections.length).toBeGreaterThan(2)
  })
})

describe('DocsAuthGate & session policy', () => {
  it('offers an actual password sign-in form and submits to Supabase', async () => {
    vi.stubEnv('VITE_API_MODE', 'supabase')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    const sdk = getSupabaseClient()
    const signIn = vi.spyOn(sdk.auth, 'signInWithPassword').mockResolvedValue({ data: { user: null, session: null }, error: null } as never)
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/docs" element={<div>Signed in</div>} /></Routes></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Institutional email'), { target: { value: 'student@vsu.edu.ph' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password-test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ email: 'student@vsu.edu.ph', password: 'password-test' }))
    await screen.findByText('Signed in')
  })

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

  it('allows unauthenticated access in development mode (isDev=true)', async () => {
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
    await waitFor(() => expect(document.querySelector('table.stack-table td[data-label="Artifact"]')).toBeTruthy())
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
      (await screen.findAllByText('openapi-redoc-bundle')).length,
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

describe('redoc-loader rendering & spec verification', () => {
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

  it('unmounts the owned Redoc root when the viewer is disposed', async () => {
    const container = document.createElement('div')
    URL.createObjectURL = vi.fn(() => 'blob:contract')
    URL.revokeObjectURL = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue(new Response('openapi: 3.1.0'))
    const controller = new AbortController()
    const dispose = await mountRedocStandalone({ specUrl: '/spec.yaml', container, fetchImpl, signal: controller.signal })
    expect(container.querySelector('[data-test-redoc]')).toBeTruthy()
    controller.abort()
    dispose()
    await waitFor(() => expect(container.childElementCount).toBe(0))
    expect(redocLifecycle.unmounted).toHaveBeenCalledTimes(1)
  })

  it('cleans up a Redoc root when loading is aborted', async () => {
    redocLifecycle.defer = true
    URL.createObjectURL = vi.fn(() => 'blob:contract')
    URL.revokeObjectURL = vi.fn()
    const container = document.createElement('div')
    const controller = new AbortController()
    const loading = mountRedocStandalone({ specUrl: '/spec.yaml', container, fetchImpl: vi.fn().mockResolvedValue(new Response('openapi: 3.1.0')), signal: controller.signal })
    await waitFor(() => expect(container.querySelector('[data-test-redoc]')).toBeTruthy())
    controller.abort()
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
    await waitFor(() => expect(redocLifecycle.unmounted).toHaveBeenCalledTimes(1))
    expect(container.childElementCount).toBe(0)
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
