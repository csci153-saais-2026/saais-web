import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ApiRuntimeMode = 'supabase' | 'mock'

export interface SaaisEnvConfig {
  readonly mode: ApiRuntimeMode
  readonly apiBaseUrl: string
  readonly supabaseUrl: string | null
  readonly supabaseKey: string | null
  readonly siteUrl: string | null
}

const DEFAULT_MOCK_API_KEY = 'saais-mock-publishable-key'
const DEFAULT_NODE_BASE_URL = 'http://127.0.0.1:54321'

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function defaultBrowserOrTestOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return DEFAULT_NODE_BASE_URL
}

/**
 * Resolves runtime API and Supabase configuration from Vite environment variables.
 * Supports both `VITE_SUPABASE_PUBLISHABLE_KEY` and legacy `VITE_SUPABASE_ANON_KEY`,
 * as well as `VITE_API_MODE=mock` for MSW / Prism development before backend keys exist.
 */
export function resolveSaaisEnvConfig(
  env: Record<string, unknown> = import.meta.env,
): SaaisEnvConfig {
  const rawMode = trimOrNull(env.VITE_API_MODE)?.toLowerCase()
  const supabaseUrl = trimOrNull(env.VITE_SUPABASE_URL)
  const explicitBaseUrl = trimOrNull(env.VITE_API_BASE_URL)
  const supabaseKey =
    trimOrNull(env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
    trimOrNull(env.VITE_SUPABASE_ANON_KEY)
  const siteUrl = trimOrNull(env.VITE_SITE_URL)

  const mode: ApiRuntimeMode =
    rawMode === 'mock'
      ? 'mock'
      : rawMode === 'supabase'
        ? 'supabase'
        : supabaseUrl && supabaseKey
          ? 'supabase'
          : 'mock'

  const apiBaseUrl =
    explicitBaseUrl ?? (mode === 'supabase' ? supabaseUrl : null) ?? defaultBrowserOrTestOrigin()

  return {
    mode,
    apiBaseUrl,
    supabaseUrl,
    supabaseKey: supabaseKey ?? (mode === 'mock' ? DEFAULT_MOCK_API_KEY : null),
    siteUrl,
  }
}

let cachedSupabaseClient: SupabaseClient | null = null

/**
 * Creates a new browser Supabase Auth client configured with explicit PKCE
 * per `contract/SUPABASE-AUTH.md`.
 */
export function createSupabaseBrowserClient(
  supabaseUrl: string,
  supabasePublishableKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

/**
 * Returns the lazily initialized singleton Supabase SDK client when running
 * against a configured Supabase project, or throws if credentials are missing.
 */
export function getSupabaseClient(explicitMode?: ApiRuntimeMode): SupabaseClient {
  if (cachedSupabaseClient) return cachedSupabaseClient

  const config = resolveSaaisEnvConfig(explicitMode ? { ...import.meta.env, VITE_API_MODE: explicitMode } : import.meta.env)
  if (!config.supabaseUrl || !config.supabaseKey || config.mode === 'mock') {
    throw new Error(
      'Supabase client is unavailable: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) and ensure VITE_API_MODE is not "mock".',
    )
  }

  cachedSupabaseClient = createSupabaseBrowserClient(
    config.supabaseUrl,
    config.supabaseKey,
  )
  return cachedSupabaseClient
}

/**
 * Resets the cached singleton Supabase client (intended for test isolation).
 */
export function resetSupabaseClientForTests(): void {
  cachedSupabaseClient = null
}
