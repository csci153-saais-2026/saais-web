import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api'
import {
  AuthHydrationError,
  changeAuthenticatedPassword,
  completePasswordReset,
  declineInvitationToken,
  evaluateAccountEntryEligibility,
  extractInviteTokenFromHash,
  extractRoleScopes,
  fetchAuthenticatedUserBoundary,
  isInstitutionalEmail,
  isInstitutionalVsuEmail,
  isValidEmailFormat,
  previewInvitationToken,
  requestPasswordRecoveryEmail,
  validatePasswordPolicy,
  verifyInvitationToken,
} from './auth-service'
import {
  getSupabaseClient,
  resetSupabaseClientForTests,
} from '@/lib/supabase/client'

describe('auth service helpers and account actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    resetSupabaseClientForTests()
  })

  it('validates password policy and institutional email formats', () => {
    expect(validatePasswordPolicy('short').valid).toBe(false)
    expect(validatePasswordPolicy('a'.repeat(129)).error).toMatch(/12 and 128/)
    expect(validatePasswordPolicy('alllowercase123').error).toMatch(/uppercase/)
    expect(validatePasswordPolicy('ALLUPPERCASE123').error).toMatch(/lowercase/)
    expect(validatePasswordPolicy('NoDigitsPassword').error).toMatch(/number/)
    expect(validatePasswordPolicy('ValidPassword123', 'ValidPassword123').error).toMatch(/identical/)
    expect(validatePasswordPolicy('ValidPassword123')).toEqual({ valid: true, error: null })

    expect(isValidEmailFormat('  student@vsu.edu.ph  ')).toBe(true)
    expect(isValidEmailFormat('not-an-email')).toBe(false)
    expect(isInstitutionalVsuEmail(' STUDENT@VSU.EDU.PH ')).toBe(true)
    expect(isInstitutionalVsuEmail('student@example.com')).toBe(false)
    expect(isInstitutionalEmail('staff@vsu.edu.ph')).toBe(true)
    expect(isInstitutionalEmail('staff@example.com')).toBe(false)
  })

  it('evaluates account eligibility, role scopes, and invite tokens', () => {
    expect(evaluateAccountEntryEligibility(null, []).isAllowedToEnter).toBe(false)
    expect(evaluateAccountEntryEligibility({ status: 'disabled', email: 'x' }, ['student']).reason).toMatch(/deactivated/)
    expect(evaluateAccountEntryEligibility({ status: 'invited', email: 'x' }, ['student']).reason).toMatch(/pending activation/)
    expect(evaluateAccountEntryEligibility({ status: 'active', email: 'x' }, []).reason).toMatch(/no active role/)
    expect(evaluateAccountEntryEligibility({ status: 'active', email: 'x' }, ['student'])).toEqual({ isAllowedToEnter: true, reason: null })

    expect(extractRoleScopes([
      { role: 'student', faculty_id: null, department_id: 'dept-1' },
    ] as never)).toEqual([{ role: 'student', facultyId: null, departmentId: 'dept-1' }])
    expect(extractInviteTokenFromHash('')).toBeNull()
    expect(extractInviteTokenFromHash('#access_token=other')).toBeNull()
    expect(extractInviteTokenFromHash('#token=%20abc%20123%20')).toBe('abc 123')
    expect(extractInviteTokenFromHash('#token=%20%20')).toBeNull()
  })

  it('loads a profile and role assignments only for the exact account id', async () => {
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({
        data: [
          { id: 'user-1', email: 'student@vsu.edu.ph', status: 'active' },
          { id: 'user-10', email: 'other@vsu.edu.ph', status: 'active' },
        ], error: undefined,
      } as never)
      .mockResolvedValueOnce({
        data: [
          { profile_id: 'user-1', role: 'student', faculty_id: null, department_id: 'dept-1' },
          { profile_id: 'user-10', role: 'admin', faculty_id: null, department_id: null },
          { profile_id: 'user-1', role: 'student', faculty_id: null, department_id: 'dept-1' },
        ], error: undefined,
      } as never)

    const result = await fetchAuthenticatedUserBoundary('user-1')
    expect(result.profile?.id).toBe('user-1')
    expect(result.roleAssignments).toHaveLength(2)
    expect(result.roles).toEqual(['student'])
  })

  it('rejects invitation API failures and invalid activation passwords', async () => {
    const post = vi.spyOn(apiClient, 'POST')
      .mockResolvedValueOnce({ data: undefined, error: { message: 'preview failed' } } as never)
    await expect(previewInvitationToken('token')).rejects.toThrow('preview failed')
    post.mockResolvedValueOnce({ data: { email: 'student@vsu.edu.ph' }, error: undefined } as never)
    await expect(previewInvitationToken('token')).resolves.toEqual({ email: 'student@vsu.edu.ph' })

    await expect(verifyInvitationToken('token', 'weak')).rejects.toThrow(/12 and 128/)
    post.mockResolvedValueOnce({ data: undefined, error: { message: 'activation failed' } } as never)
    await expect(verifyInvitationToken('token', 'StrongPassword123')).rejects.toThrow('activation failed')
    post.mockResolvedValueOnce({ data: { status: 'verified' }, error: undefined } as never)
    await expect(verifyInvitationToken('token', 'StrongPassword123')).resolves.toEqual({ status: 'verified' })

    post.mockResolvedValueOnce({ data: undefined, error: { message: 'decline failed' } } as never)
    await expect(declineInvitationToken('token', 'No longer needed')).rejects.toThrow('decline failed')
    post.mockResolvedValueOnce({ data: { status: 'declined' }, error: undefined } as never)
    await expect(declineInvitationToken('token')).resolves.toEqual({ status: 'declined' })
    expect(post).toHaveBeenLastCalledWith('/functions/v1/auth/decline-invite', { body: { token: 'token' } })
  })

  it('handles password recovery and reset in mock mode and rejects invalid input', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    await expect(requestPasswordRecoveryEmail('bad-email')).rejects.toThrow(/valid email/)
    await expect(requestPasswordRecoveryEmail(' student@vsu.edu.ph ')).resolves.toEqual({ simulated: true })
    await expect(completePasswordReset('weak')).rejects.toThrow(/12 and 128/)
    await expect(completePasswordReset('StrongPassword123')).resolves.toEqual({ simulated: true })
    await expect(changeAuthenticatedPassword('', 'StrongPassword123')).rejects.toThrow(/Current password/)
    await expect(changeAuthenticatedPassword('old-password', 'weak')).rejects.toThrow(/12 and 128/)
    await expect(changeAuthenticatedPassword('SamePassword123', 'SamePassword123')).rejects.toThrow(/identical/)
    await expect(changeAuthenticatedPassword('old-password', 'StrongPassword123')).resolves.toEqual({ simulated: true })
  })

  it('fails closed when Supabase password actions have incomplete configuration', async () => {
    vi.stubEnv('VITE_API_MODE', 'supabase')
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    await expect(requestPasswordRecoveryEmail('student@vsu.edu.ph')).rejects.toThrow(/Supabase configuration is missing/i)
    await expect(completePasswordReset('StrongPassword123')).rejects.toThrow(/Supabase configuration is missing/i)
    await expect(changeAuthenticatedPassword('CurrentPassword123', 'NewPassword123')).rejects.toThrow(/Supabase configuration is missing/i)
  })

  it('uses Supabase password endpoints and propagates SDK errors', async () => {
    vi.stubEnv('VITE_API_MODE', 'supabase')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
    const auth = getSupabaseClient('supabase').auth
    const recover = vi.spyOn(auth, 'resetPasswordForEmail').mockResolvedValue({ data: {}, error: null })
    const update = vi.spyOn(auth, 'updateUser').mockResolvedValue({ data: { user: null }, error: null })
    const signOut = vi.spyOn(auth, 'signOut').mockResolvedValue({ error: null })

    await expect(requestPasswordRecoveryEmail(' student@vsu.edu.ph ')).resolves.toEqual({ simulated: false })
    expect(recover).toHaveBeenCalledWith('student@vsu.edu.ph', { redirectTo: `${window.location.origin}/reset-password` })
    await expect(completePasswordReset('StrongPassword123')).resolves.toEqual({ simulated: false })
    await expect(changeAuthenticatedPassword('CurrentPassword123', 'NewPassword123')).resolves.toEqual({ simulated: false })
    expect(signOut).toHaveBeenCalledWith({ scope: 'others' })

    recover.mockResolvedValueOnce({ error: new Error('recovery failed') as never })
    await expect(requestPasswordRecoveryEmail('student@vsu.edu.ph')).rejects.toThrow('recovery failed')
    update.mockResolvedValueOnce({ data: { user: null }, error: new Error('update failed') as never })
    await expect(completePasswordReset('AnotherPassword123')).rejects.toThrow('update failed')
  })

  it('surfaces hydration errors with server messages and unexpected response shapes', async () => {
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({ data: undefined, error: { message: 'profile failed' } } as never)
      .mockResolvedValueOnce({ data: [], error: undefined } as never)
    await expect(fetchAuthenticatedUserBoundary('user-1')).rejects.toThrow(AuthHydrationError)

    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({ data: null, error: undefined } as never)
      .mockResolvedValueOnce({ data: [], error: undefined } as never)
    await expect(fetchAuthenticatedUserBoundary('user-1')).rejects.toThrow(/unexpected response/i)

    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({ data: [], error: undefined } as never)
      .mockResolvedValueOnce({ data: undefined, error: {} } as never)
    await expect(fetchAuthenticatedUserBoundary('user-1')).rejects.toThrow(/role assignments/i)
  })
})
