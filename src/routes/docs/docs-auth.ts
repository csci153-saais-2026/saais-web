import { resolveCurrentAccessToken } from '@/lib/api'

export type SessionCheckFn = () => Promise<boolean>

/**
 * Checks whether an active user access token is available in the current
 * runtime mode (Supabase Auth session or MSW/mock session token).
 * Never throws if environment credentials are absent; returns `false`.
 */
export async function checkDocsSessionAuthenticated(): Promise<boolean> {
  try {
    const token = await resolveCurrentAccessToken()
    return typeof token === 'string' && token.trim().length > 0
  } catch {
    return false
  }
}
