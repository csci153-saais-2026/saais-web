import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { useResendDepartmentInvitation } from './use-resend-department-invitation'
import { useRevokeDepartmentInvitation } from './use-revoke-department-invitation'

const mocks = vi.hoisted(() => ({
  useStaffScope: vi.fn(),
  useAuth: vi.fn(),
  resend: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('@/routes/department-staff/shared/use-staff-scope', () => ({
  useStaffScope: mocks.useStaffScope,
}))
vi.mock('@/hooks/use-auth', () => ({ useAuth: mocks.useAuth }))
vi.mock('@/routes/department-staff/accounts/accounts.api', () => ({
  resendDepartmentAccountInvitation: mocks.resend,
  revokeDepartmentAccountInvitation: mocks.revoke,
}))

const scope = {
  status: 'ready',
  profileId: 'staff-id',
  departmentId: 'department-id',
}
const accountKey = staffQueryKeys.resource('staff-id', 'department-id', 'accounts')

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hooks = renderHook(() => ({
    resend: useResendDepartmentInvitation(),
    revoke: useRevokeDepartmentInvitation(),
  }), { wrapper })
  return { ...hooks, invalidate }
}

beforeEach(() => {
  mocks.useStaffScope.mockReturnValue(scope)
  mocks.useAuth.mockReturnValue({ user: { id: 'staff-id' } })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('department invitation actions', () => {
  it('calls both actions and refreshes the account directory after success', async () => {
    mocks.resend.mockResolvedValue({ message: 'Resent' })
    mocks.revoke.mockResolvedValue({ id: 'target-id' })
    const { result, invalidate } = setup()

    await act(async () => {
      await result.current.resend.mutateAsync('target-id')
      await result.current.revoke.mutateAsync('target-id')
    })

    expect(mocks.resend).toHaveBeenCalledWith('target-id')
    expect(mocks.revoke).toHaveBeenCalledWith('target-id')
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKey })
  })

  it('rejects self actions and actions without a matching active staff session', async () => {
    const { result, rerender } = setup()

    await act(async () => {
      await expect(result.current.resend.mutateAsync('staff-id')).rejects.toThrow('A different account')
      await expect(result.current.revoke.mutateAsync('')).rejects.toThrow('A different account')
    })
    expect(mocks.resend).not.toHaveBeenCalled()
    expect(mocks.revoke).not.toHaveBeenCalled()

    mocks.useAuth.mockReturnValue({ user: { id: 'other-user' } })
    rerender()
    await act(async () => {
      await expect(result.current.resend.mutateAsync('target-id')).rejects.toThrow('active Department Staff assignment')
      await expect(result.current.revoke.mutateAsync('target-id')).rejects.toThrow('active Department Staff assignment')
    })
  })

  it.each(['conflict', 'network'] as const)('refreshes accounts after a %s failure', async kind => {
    const error = new ApiClientError(normalizeApiError(
      kind === 'conflict'
        ? { message: 'conflict failure' }
        : new Error('network failure'),
      kind === 'conflict' ? new Response(null, { status: 409 }) : undefined,
    ))
    mocks.resend.mockRejectedValue(error)
    mocks.revoke.mockRejectedValue(error)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.resend.mutateAsync('target-id')).rejects.toBe(error)
      await expect(result.current.revoke.mutateAsync('target-id')).rejects.toBe(error)
    })

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: accountKey })
  })
})
