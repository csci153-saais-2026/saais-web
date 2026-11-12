import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as React from 'react'
import { AuthProvider } from '../AuthProvider'
import { useAuth } from '@/hooks/use-auth'
import { MOCK_PERSONAS } from '@/mocks/personas'
import { resetMockDatabase } from '@/mocks/store'
import { getSyntheticPersonas } from '@/lib/auth/mock-auth-service'

describe('AuthProvider & useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    resetMockDatabase()
  })

  it('provides unauthenticated state by default when no mock persona is stored', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isAllowedToEnter).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.roles).toEqual([])
    expect(result.current.roleAssignments).toEqual([])
    expect(result.current.activeRole).toBeNull()
  })

  it('exercises Student-only, Adviser-only, Dean-only, and Multi-role synthetic personas', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    // 1. Student-only account
    act(() => {
      result.current.switchMockPersona('student')
    })
    expect(result.current.user?.fullName).toBe(MOCK_PERSONAS.student.fullName)
    expect(result.current.roles).toEqual(['student'])
    expect(result.current.activeRole).toBe('student')
    expect(result.current.isAllowedToEnter).toBe(true)

    // 2. Adviser-only account
    act(() => {
      result.current.switchMockPersona('adviser')
    })
    expect(result.current.user?.fullName).toBe('Polo, Marco Antonio P.')
    expect(result.current.roles).toEqual(['adviser'])
    expect(result.current.activeRole).toBe('adviser')
    expect(result.current.isAllowedToEnter).toBe(true)

    // 3. Dean-only account
    act(() => {
      result.current.switchMockPersona('dean_only')
    })
    expect(result.current.roles).toEqual(['dean'])
    expect(result.current.activeRole).toBe('dean')
    expect(result.current.isAllowedToEnter).toBe(true)

    // 4. Multi-role account: Dean + Adviser
    act(() => {
      result.current.switchMockPersona('dean')
    })
    expect(result.current.user?.fullName).toBe('Montera, Mhac Alester')
    expect(result.current.primaryRole).toBe('dean')
    expect(result.current.activeRole).toBe('dean')
    expect(result.current.roles).toEqual(['dean', 'adviser'])
    expect(result.current.roleAssignments).toHaveLength(2)

    // Switch active role between authorized roles
    act(() => {
      result.current.setActiveRole('adviser')
    })
    expect(result.current.activeRole).toBe('adviser')

    // 5. Multi-role account: Dean + Department Head + Adviser
    act(() => {
      result.current.switchMockPersona('dean_dept_head')
    })
    expect(result.current.roles).toEqual(['dean', 'department_head', 'adviser'])
    expect(result.current.roleAssignments).toHaveLength(3)

    // Sign out clears state
    act(() => {
      void result.current.signOut()
    })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.activeRole).toBeNull()
  })

  it('blocks entry when switched to an invited or disabled synthetic persona', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Invited account (student_secondary is seeded as status: 'invited')
    act(() => {
      result.current.switchMockPersona('student_secondary')
    })
    expect(result.current.user?.status).toBe('invited')
    expect(result.current.isAllowedToEnter).toBe(false)
    expect(result.current.entryBlockedReason).toMatch(/pending activation/i)

    // Disabled / Inactive account
    act(() => {
      result.current.switchMockPersona('disabled_account')
    })
    expect(result.current.user?.status).toBe('disabled')
    expect(result.current.isAllowedToEnter).toBe(false)
    expect(result.current.entryBlockedReason).toMatch(/deactivated/i)
  })

  it('rejects password sign-in for non-institutional, unrecognized, invited, and disabled accounts', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    const personas = getSyntheticPersonas()

    // Non-institutional email
    await expect(
      result.current.signInWithPassword('random@gmail.com', 'Password1234!'),
    ).rejects.toThrow('Only institutional emails (.edu.ph) are permitted.')

    // Unrecognized institutional email
    await expect(
      result.current.signInWithPassword('unknown.person@vsu.edu.ph', 'Password1234!'),
    ).rejects.toThrow(/not a registered institutional profile/i)

    // Invited account that has not yet completed /invite activation
    await expect(
      result.current.signInWithPassword(
        MOCK_PERSONAS.student_secondary.email,
        'Password1234!',
      ),
    ).rejects.toThrow(/pending activation/i)

    // Disabled / inactive account
    await expect(
      result.current.signInWithPassword(
        personas.disabled_account.email,
        'Password1234!',
      ),
    ).rejects.toThrow(/deactivated/i)
  })

  it('persists session in localStorage when keepSignedIn is true and sessionStorage when false', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Sign in with keepSignedIn = false -> sessionStorage
    await act(async () => {
      await result.current.signInWithPassword(
        MOCK_PERSONAS.adviser.email,
        'Secret12345!',
        false,
      )
    })

    expect(result.current.user?.email).toBe(MOCK_PERSONAS.adviser.email)
    expect(result.current.keepSignedIn).toBe(false)
    expect(sessionStorage.getItem('saais_active_mock_persona')).toBe('adviser')
    expect(localStorage.getItem('saais_active_mock_persona')).toBeNull()

    // Sign in with keepSignedIn = true -> localStorage
    await act(async () => {
      await result.current.signInWithPassword(
        MOCK_PERSONAS.student.email,
        'Secret12345!',
        true,
      )
    })

    expect(result.current.user?.email).toBe(MOCK_PERSONAS.student.email)
    expect(result.current.keepSignedIn).toBe(true)
    expect(localStorage.getItem('saais_active_mock_persona')).toBe('student')
  })
})
