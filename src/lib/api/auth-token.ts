import {
  getSupabaseClient,
  resolveSaaisEnvConfig,
  type ApiRuntimeMode,
} from '@/lib/supabase/client'

export type AccessTokenResolver = () => Promise<string | null> | string | null

let customAccessTokenResolver: AccessTokenResolver | null = null
let mockSessionAccessToken: string | null = null

/**
 * Sets or clears an in-memory mock bearer token used when `VITE_API_MODE=mock`
 * (e.g. MSW mock login, dev role-switcher, and automated integration tests).
 */
export function setMockSessionToken(token: string | null): void {
  const trimmed = token?.trim() ?? ''
  mockSessionAccessToken = trimmed.length > 0 ? trimmed : null
}

export function getMockSessionToken(): string | null {
  return mockSessionAccessToken
}

/**
 * Registers a custom access-token resolver (overrides default mock/Supabase lookup).
 * Pass `null` to restore default mode-based resolution.
 */
export function setAccessTokenResolver(
  resolver: AccessTokenResolver | null,
): void {
  customAccessTokenResolver = resolver
}

/**
 * Resolves the current user access token on every protected API request so
 * refreshed tokens and sign-outs take effect immediately without stale header caches.
 */
export async function resolveCurrentAccessToken(
  explicitMode?: ApiRuntimeMode,
): Promise<string | null> {
  if (customAccessTokenResolver) {
    const token = await customAccessTokenResolver()
    return token && token.trim().length > 0 ? token.trim() : null
  }

  const mode = explicitMode ?? resolveSaaisEnvConfig().mode
  if (mode === 'mock') {
    return mockSessionAccessToken
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    return null
  }
  return data.session.access_token
}
