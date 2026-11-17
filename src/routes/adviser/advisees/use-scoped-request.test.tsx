import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { useScopedRequest } from './use-scoped-request'

afterEach(cleanup)
describe('useScopedRequest retained results', () => {
  it('keeps the prior key on failure and advances it after a successful retry', async () => {
    const load = vi.fn().mockResolvedValueOnce('old').mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce('new')
    const { result, rerender } = renderHook(({ key }) => useScopedRequest(key, true, load, true), { initialProps: { key: 'one' } })
    await waitFor(() => expect(result.current.data).toBe('old'))
    rerender({ key: 'two' })
    await waitFor(() => expect(result.current.error).toBe('Offline'))
    expect(result.current).toMatchObject({ key: 'one', data: 'old' })
    rerender({ key: 'three' })
    await waitFor(() => expect(result.current).toMatchObject({ key: 'three', data: 'new' }))
  })
})
