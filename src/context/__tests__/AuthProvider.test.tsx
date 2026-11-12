import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import * as React from 'react'
import { AuthProvider } from '../AuthProvider'
import { useAuth } from '@/hooks/use-auth'
import { MOCK_PERSONAS } from '@/mocks/personas'
import { resetMockDatabase } from '@/mocks/store'
import { getSyntheticPersonas } from '@/lib/auth/mock-auth-service'
import {
  AuthHydrationError,
  fetchAuthenticatedUserBoundary,
} from '@/lib/auth/auth-service'
import { apiClient } from '@/lib/api'
import {
  getSupabaseClient,
  resetSupabaseClientForTests,
  resolveSaaisEnvConfig,
  saaisAuthStorage,
  setSupabaseSessionPersistence,
} from '@/lib/supabase/client'

describe('AuthProvider, useAuth & Environment Config', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    resetSupabaseClientForTests()
    localStorage.clear()
    sessionStorage.clear()
    resetMockDatabase()
    setSupabaseSessionPersistence(true)
  })

  it('throws explicitly when useAuth() is called outside <AuthProvider>', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used within an <AuthProvider>/i,
    )
  })

  it('fails clearly in production when Supabase configuration is missing instead of defaulting to mock', () => {
    const prodConfig = resolveSaaisEnvConfig({ PROD: true })
    expect(prodConfig.mode).toBe('supabase')
    expect(prodConfig.configError).toMatch(/Supabase configuration is missing/i)
  })

  it('stores real Supabase session tokens in localStorage vs sessionStorage based on keepSignedIn', () => {
    setSupabaseSessionPersistence(false)
    saaisAuthStorage.setItem('sb-test-auth-token', 'session-only-token')
    expect(sessionStorage.getItem('sb-test-auth-token')).toBe(
      'session-only-token',
    )
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull()

    setSupabaseSessionPersistence(true)
    saaisAuthStorage.setItem('sb-test-auth-token', 'persistent-token')
    expect(localStorage.getItem('sb-test-auth-token')).toBe('persistent-token')
    expect(sessionStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('fails closed in fetchAuthenticatedUserBoundary on API errors, unexpected shapes, or missing exact profile match', async () => {
    // 1. Profile API error -> throws AuthHydrationError
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: 'Database unavailable' },
        response: new Response(null, { status: 500 }),
      } as never)
      .mockResolvedValueOnce({
        data: [],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)

    await expect(
      fetchAuthenticatedUserBoundary('user-123'),
    ).rejects.toThrow(AuthHydrationError)

    // 2. Role assignment API error -> throws AuthHydrationError
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({
        data: [{ id: 'user-123', email: 'a@vsu.edu.ph', role: 'student', roles: ['student'], status: 'active' }],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: 'Role query failed' },
        response: new Response(null, { status: 500 }),
      } as never)

    await expect(
      fetchAuthenticatedUserBoundary('user-123'),
    ).rejects.toThrow(AuthHydrationError)

    // 3. Mismatched profile row -> returns null profile (never falls back to row[0])
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({
        data: [{ id: 'different-user', email: 'other@vsu.edu.ph', role: 'admin', roles: ['admin'], status: 'active' }],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)
      .mockResolvedValueOnce({
        data: [],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)

    const result = await fetchAuthenticatedUserBoundary('user-123')
    expect(result.profile).toBeNull()
    expect(result.roles).toEqual([])
  })

  it('exercises Student-only, Adviser-only, Dept-Head-only, Dean-only, and Multi-role synthetic personas', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    act(() => {
      result.current.switchMockPersona('student')
    })
    expect(result.current.roles).toEqual(['student'])
    expect(result.current.isAllowedToEnter).toBe(true)

    act(() => {
      result.current.switchMockPersona('adviser')
    })
    expect(result.current.roles).toEqual(['adviser'])
    expect(result.current.isAllowedToEnter).toBe(true)

    act(() => {
      result.current.switchMockPersona('department_head_only')
    })
    expect(result.current.roles).toEqual(['department_head'])
    expect(result.current.roleScopes[0]?.departmentId).toBeTruthy()

    act(() => {
      result.current.switchMockPersona('dean_only')
    })
    expect(result.current.roles).toEqual(['dean'])
    expect(result.current.isAllowedToEnter).toBe(true)

    act(() => {
      result.current.switchMockPersona('dean_dept_head')
    })
    expect(result.current.roles).toEqual(['dean', 'department_head', 'adviser'])
    expect(result.current.roleAssignments).toHaveLength(3)

    act(() => {
      void result.current.signOut()
    })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('handles Supabase session initialization, confirmed disabled signOut, and transient hydration errors safely', async () => {
    vi.stubEnv('VITE_API_MODE', 'supabase')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')

    const sdk = getSupabaseClient('supabase')
    const mockSession = {
      access_token: 'sb-jwt',
      user: {
        id: 'disabled-uid',
        email: 'inactive@vsu.edu.ph',
        app_metadata: { provider: 'password' },
      },
    }

    vi.spyOn(sdk.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession as never },
      error: null,
    })
    vi.spyOn(sdk.auth, 'onAuthStateChange').mockImplementation(() => ({
      data: {
        subscription: { id: 'sub-1', callback: vi.fn(), unsubscribe: vi.fn() },
      },
    }))
    const localSignOutSpy = vi
      .spyOn(sdk.auth, 'signOut')
      .mockResolvedValue({ error: null })

    // Confirmed disabled profile -> clears session locally & exposes entryBlockedReason
    vi.spyOn(apiClient, 'GET')
      .mockResolvedValueOnce({
        data: [
          {
            id: 'disabled-uid',
            email: 'inactive@vsu.edu.ph',
            full_name: 'Inactive User',
            role: 'student',
            roles: ['student'],
            status: 'disabled',
          },
        ],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)
      .mockResolvedValueOnce({
        data: [
          {
            id: 'ra-1',
            profile_id: 'disabled-uid',
            role: 'student',
            faculty_id: null,
            department_id: null,
          },
        ],
        error: undefined,
        response: new Response(null, { status: 200 }),
      } as never)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(localSignOutSpy).toHaveBeenCalledWith({ scope: 'local' })
    })
    expect(result.current.isAllowedToEnter).toBe(false)
    expect(result.current.entryBlockedReason).toMatch(/deactivated/i)
  })

  it('rejects password sign-in for unrecognized, invited, and disabled accounts and honors keepSignedIn', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    const personas = getSyntheticPersonas()

    await expect(
      result.current.signInWithPassword('unknown.person@vsu.edu.ph', 'Password1234!'),
    ).rejects.toThrow(/not a registered institutional profile/i)

    await expect(
      result.current.signInWithPassword(
        MOCK_PERSONAS.student_secondary.email,
        'Password1234!',
      ),
    ).rejects.toThrow(/pending activation/i)

    await expect(
      result.current.signInWithPassword(
        personas.disabled_account.email,
        'Password1234!',
      ),
    ).rejects.toThrow(/deactivated/i)

    await act(async () => {
      await result.current.signInWithPassword(
        MOCK_PERSONAS.adviser.email,
        'Secret12345!',
        false,
      )
    })
    expect(sessionStorage.getItem('saais_active_mock_persona')).toBe('adviser')
    expect(localStorage.getItem('saais_active_mock_persona')).toBeNull()
  })
})
