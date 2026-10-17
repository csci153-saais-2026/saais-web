import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SessionProvider } from '../SessionContext'
import { useSession } from '../../hooks/useSession'
import React from 'react'

describe('SessionContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('provides default dev role state when no override is set', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    )

    let hookResult: ReturnType<typeof renderHook<ReturnType<typeof useSession>, { children: React.ReactNode }>> | undefined
    await act(async () => {
      hookResult = renderHook(() => useSession(), { wrapper })
    })

    expect(hookResult?.result.current.isLoading).toBe(false)
    expect(hookResult?.result.current.role).toBeNull()
  })

  it('allows switching dev roles in local development mode', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SessionProvider>{children}</SessionProvider>
    )

    let hookResult: ReturnType<typeof renderHook<ReturnType<typeof useSession>, { children: React.ReactNode }>> | undefined
    await act(async () => {
      hookResult = renderHook(() => useSession(), { wrapper })
    })
    const result = hookResult!.result

    act(() => {
      result.current.setDevRole('student')
    })

    expect(result.current.role).toBe('student')
    expect(result.current.profile?.role).toBe('student')
    expect(result.current.profile?.full_name).toContain('Juan Dela Cruz')
    expect(result.current.isDevOverride).toBe(true)

    act(() => {
      result.current.setDevRole('adviser')
    })

    expect(result.current.role).toBe('adviser')
    expect(result.current.profile?.role).toBe('adviser')
    expect(result.current.profile?.full_name).toContain('Dr. Maria Santos')

    act(() => {
      result.current.setDevRole('admin')
    })

    expect(result.current.role).toBe('admin')
    expect(result.current.profile?.role).toBe('admin')

    act(() => {
      result.current.setDevRole('none')
    })

    expect(result.current.role).toBeNull()
    expect(result.current.profile).toBeNull()
  })
})
