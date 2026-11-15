import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js'

export type ApiRuntimeMode = 'supabase' | 'mock'

export interface SaaisEnvConfig {
  readonly mode: ApiRuntimeMode
  readonly apiBaseUrl: string
  readonly supabaseUrl: string | null
  readonly supabaseKey: string | null
  readonly siteUrl: string | null
  readonly configError: string | null
}

const DEFAULT_MOCK_API_KEY = 'saais-mock-publishable-key'
const DEFAULT_NODE_BASE_URL = 'http://127.0.0.1:54321'
export const KEEP_SIGNED_IN_STORAGE_KEY = 'saais_keep_signed_in'

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

let keepSignedInPreference = true

if (typeof window !== 'undefined') {
  try {
    const storedPref =
      window.sessionStorage.getItem(KEEP_SIGNED_IN_STORAGE_KEY) ??
      window.localStorage.getItem(KEEP_SIGNED_IN_STORAGE_KEY)
    if (storedPref === 'false') {
      keepSignedInPreference = false
    }
  } catch {
    keepSignedInPreference = true
  }
}

/**
 * Updates whether Supabase Auth session tokens are persisted across browser
 * restarts (`localStorage` when `true`) or limited to the current browser
 * session (`sessionStorage` when `false`).
 */
export function setSupabaseSessionPersistence(keepSignedIn: boolean): void {
  keepSignedInPreference = keepSignedIn
  if (typeof window === 'undefined') return
  try {
    if (keepSignedIn) {
      window.localStorage.setItem(KEEP_SIGNED_IN_STORAGE_KEY, 'true')
      window.sessionStorage.removeItem(KEEP_SIGNED_IN_STORAGE_KEY)
    } else {
      window.sessionStorage.setItem(KEEP_SIGNED_IN_STORAGE_KEY, 'false')
      window.localStorage.removeItem(KEEP_SIGNED_IN_STORAGE_KEY)
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getSupabaseSessionPersistence(): boolean {
  return keepSignedInPreference
}

/**
 * Storage adapter for the singleton Supabase SDK client that honors
 * `keepSignedInPreference` while preserving PKCE code-verifier lookups
 * across both `sessionStorage` and `localStorage`.
 */
export const saaisAuthStorage: SupportedStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null
    try {
      return (
        window.sessionStorage.getItem(key) ??
        window.localStorage.getItem(key)
      )
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return
    try {
      if (keepSignedInPreference) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, value)
        window.localStorage.removeItem(key)
      }
    } catch {
      // Ignore storage errors
    }
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {
      // Ignore storage errors
    }
  },
}

/**
 * Resolves runtime API and Supabase configuration from Vite environment variables.
 * Supports both `VITE_SUPABASE_PUBLISHABLE_KEY` and legacy `VITE_SUPABASE_ANON_KEY`,
 * as well as `VITE_API_MODE=mock` for MSW / Prism development before backend keys exist.
 *
 * In production builds (`PROD === true`), missing Supabase credentials do NOT
 * silently fall back to `'mock'` unless `VITE_API_MODE=mock` is explicitly set.
 */
export function resolveSaaisEnvConfig(
  env: Record<string, unknown> = import.meta.env,
): SaaisEnvConfig {
  const rawMode = trimOrNull(env.VITE_API_MODE)?.toLowerCase()
  const isProd = env.PROD === true || env.PROD === 'true'
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
          : isProd
            ? 'supabase'
            : 'mock'

  let configError: string | null = null
  if (mode === 'supabase' && (!supabaseUrl || !supabaseKey)) {
    configError =
      'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).'
  }

  const apiBaseUrl =
    explicitBaseUrl ??
    (mode === 'supabase' ? supabaseUrl : null) ??
    defaultBrowserOrTestOrigin()

  return {
    mode,
    apiBaseUrl,
    supabaseUrl,
    supabaseKey: supabaseKey ?? (mode === 'mock' ? DEFAULT_MOCK_API_KEY : null),
    siteUrl,
    configError,
  }
}

let cachedSupabaseClient: SupabaseClient | null = null

/**
 * Creates a new browser Supabase Auth client configured with explicit PKCE
 * per `contract/SUPABASE-AUTH.md` and configurable session persistence storage.
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
      storage: saaisAuthStorage,
    },
  })
}

/**
 * Returns the lazily initialized singleton Supabase SDK client when running
 * against a configured Supabase project, or throws if credentials are missing.
 */
export function getSupabaseClient(explicitMode?: ApiRuntimeMode): SupabaseClient {
  if (cachedSupabaseClient) return cachedSupabaseClient

  const config = resolveSaaisEnvConfig(
    explicitMode
      ? { ...import.meta.env, VITE_API_MODE: explicitMode }
      : import.meta.env,
  )
  if (!config.supabaseUrl || !config.supabaseKey || config.mode === 'mock') {
    throw new Error(
      config.configError ??
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
