import { apiClient, type ApiSchema } from '@/lib/api'
import {
  getSupabaseClient,
  resolveSaaisEnvConfig,
} from '@/lib/supabase/client'
import type { SaaisRole } from '@/mocks/personas'
import { getMockDatabase } from '@/mocks/store'

export const ROLE_DEFAULT_ROUTE: Readonly<Record<SaaisRole, string>> = {
  student: '/student',
  adviser: '/adviser',
  department_head: '/department-head',
  department_staff: '/department-staff',
  dean: '/dean',
  admin: '/admin',
}

export interface PasswordValidationResult {
  readonly valid: boolean
  readonly error: string | null
}

/**
 * Validates the SAAIS password policy (FR-AUTH-13 & contract/SUPABASE-AUTH.md):
 * - 12 to 128 characters
 * - At least one uppercase letter, one lowercase letter, and one digit
 * - Must differ from currentPassword when changing an existing password
 */
export function validatePasswordPolicy(
  password: string,
  currentPassword?: string,
): PasswordValidationResult {
  if (password.length < 12 || password.length > 128) {
    return {
      valid: false,
      error: 'Password must be between 12 and 128 characters.',
    }
  }

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return {
      valid: false,
      error:
        'Password must include at least one uppercase letter, one lowercase letter, and one number.',
    }
  }

  if (currentPassword !== undefined && password === currentPassword) {
    return {
      valid: false,
      error: 'New password must not be identical to your current password.',
    }
  }

  return { valid: true, error: null }
}

export function isInstitutionalEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase()
  return trimmed.includes('@') && trimmed.endsWith('.edu.ph')
}

export interface AccountEntryEligibility {
  readonly isAllowedToEnter: boolean
  readonly reason: string | null
}

export function evaluateAccountEntryEligibility(
  profile: Pick<ApiSchema<'Profile'>, 'status' | 'email'> | null,
  roles: readonly SaaisRole[],
): AccountEntryEligibility {
  if (!profile) {
    return {
      isAllowedToEnter: false,
      reason:
        'Sign-in was rejected: Your email is not a registered institutional profile. Please contact your department administrator to provision access.',
    }
  }

  if (profile.status === 'disabled') {
    return {
      isAllowedToEnter: false,
      reason:
        'Sign-in was rejected: Your institutional account has been deactivated. Please contact your department administrator.',
    }
  }

  if (profile.status === 'invited') {
    return {
      isAllowedToEnter: false,
      reason:
        'Sign-in was rejected: Your account invitation is still pending activation. Please complete the setup link sent to your institutional email or sign in with Google.',
    }
  }

  if (roles.length === 0) {
    return {
      isAllowedToEnter: false,
      reason:
        'Sign-in was rejected: Your account has no active role assignments. Please contact your department administrator.',
    }
  }

  return { isAllowedToEnter: true, reason: null }
}

export function extractInviteTokenFromHash(hash: string): string | null {
  if (!hash) return null
  const match = hash.match(/(?:^|[#&])token=([^&]+)/)
  if (!match || !match[1]) return null
  const decoded = decodeURIComponent(match[1]).trim()
  return decoded.length > 0 ? decoded : null
}

/**
 * Loads the authenticated user's Profile and RoleAssignment records through
 * the documented OpenAPI contract boundary (`/rest/v1/profile` & `/rest/v1/role_assignment`).
 */
export async function fetchAuthenticatedUserBoundary(userId: string): Promise<{
  profile: ApiSchema<'Profile'> | null
  roleAssignments: ApiSchema<'RoleAssignment'>[]
  roles: SaaisRole[]
}> {
  const [profileRes, rolesRes] = await Promise.all([
    apiClient.GET('/rest/v1/profile', {
      params: {
        query: {
          id: `eq.${userId}`,
          limit: 1,
        },
      },
    }),
    apiClient.GET('/rest/v1/role_assignment', {
      params: {
        query: {
          profile_id: `eq.${userId}`,
        },
      },
    }),
  ])

  const profileRows = (profileRes.data ?? []) as ApiSchema<'Profile'>[]
  const profile =
    profileRows.find((row) => row.id === userId) ?? profileRows[0] ?? null

  const rawAssignments = (rolesRes.data ?? []) as ApiSchema<'RoleAssignment'>[]
  const roleAssignments = rawAssignments.filter((r) => r.profile_id === userId)

  const roleSet = new Set<SaaisRole>()
  if (profile?.role) {
    roleSet.add(profile.role)
  }
  if (profile?.roles) {
    for (const r of profile.roles) {
      roleSet.add(r)
    }
  }
  for (const assignment of roleAssignments) {
    roleSet.add(assignment.role)
  }

  return {
    profile,
    roleAssignments,
    roles: Array.from(roleSet),
  }
}

export async function previewInvitationToken(
  token: string,
): Promise<ApiSchema<'PreviewInviteResponse'>> {
  const { data, error } = await apiClient.POST(
    '/functions/v1/auth/preview-invite',
    {
      body: { token },
    },
  )

  if (error || !data) {
    const msg =
      (error as { message?: string })?.message ||
      'Failed to load invitation preview.'
    throw new Error(msg)
  }

  return data
}

export async function verifyInvitationToken(
  token: string,
  password: string,
): Promise<ApiSchema<'VerifyInviteResponse'>> {
  const validation = validatePasswordPolicy(password)
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid password.')
  }

  const { data, error } = await apiClient.POST(
    '/functions/v1/auth/verify-invite',
    {
      body: { token, password },
    },
  )

  if (error || !data) {
    const msg =
      (error as { message?: string })?.message || 'Account activation failed.'
    throw new Error(msg)
  }

  // In mock mode, transition the invited profile in the in-memory mock database
  // so subsequent password sign-in succeeds immediately.
  if (resolveSaaisEnvConfig().mode === 'mock') {
    const db = getMockDatabase()
    db.profiles = db.profiles.map((profile) =>
      profile.status === 'invited'
        ? { ...profile, status: 'active', invitation_status: 'accepted' }
        : profile,
    )
  }

  return data
}

export async function declineInvitationToken(
  token: string,
  reason?: string,
): Promise<ApiSchema<'DeclineInviteResponse'>> {
  const { data, error } = await apiClient.POST(
    '/functions/v1/auth/decline-invite',
    {
      body: reason ? { token, reason } : { token },
    },
  )

  if (error || !data) {
    const msg =
      (error as { message?: string })?.message ||
      'Failed to decline invitation.'
    throw new Error(msg)
  }

  return data
}

export async function requestPasswordRecoveryEmail(
  email: string,
): Promise<void> {
  const trimmedEmail = email.trim()
  if (!isInstitutionalEmail(trimmedEmail)) {
    throw new Error(
      'Please enter a valid institutional email address (.edu.ph).',
    )
  }

  const { mode } = resolveSaaisEnvConfig()
  if (mode === 'supabase') {
    const client = getSupabaseClient('supabase')
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined
    const { error } = await client.auth.resetPasswordForEmail(
      trimmedEmail,
      redirectTo ? { redirectTo } : undefined,
    )
    if (error) throw error
    return
  }

  // In mock mode, verify the email belongs to a provisioned profile
  const db = getMockDatabase()
  const matched = db.profiles.find(
    (p) => p.email.toLowerCase() === trimmedEmail.toLowerCase(),
  )
  if (!matched) {
    throw new Error(
      'Account not found: No provisioned institutional profile matches this email address.',
    )
  }
  if (matched.status === 'disabled') {
    throw new Error(
      'Password recovery is unavailable: This institutional account has been deactivated.',
    )
  }
}

export async function completePasswordReset(
  newPassword: string,
): Promise<void> {
  const validation = validatePasswordPolicy(newPassword)
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid password.')
  }

  const { mode } = resolveSaaisEnvConfig()
  if (mode === 'supabase') {
    const client = getSupabaseClient('supabase')
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) throw error
  }
}

export async function changeAuthenticatedPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword) {
    throw new Error('Current password is required.')
  }

  const validation = validatePasswordPolicy(newPassword, currentPassword)
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid password.')
  }

  const { mode } = resolveSaaisEnvConfig()
  if (mode === 'supabase') {
    const client = getSupabaseClient('supabase')
    const { error: updateError } = await client.auth.updateUser({
      current_password: currentPassword,
      password: newPassword,
    } as unknown as { password: string })
    if (updateError) throw updateError

    await client.auth.signOut({ scope: 'others' })
  }
}
