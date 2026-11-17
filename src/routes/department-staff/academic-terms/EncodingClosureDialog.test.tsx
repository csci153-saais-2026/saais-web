import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiClientError, normalizeApiError } from '@/lib/api'
import type { SchoolTerm } from './academic-terms.api'
import { encodingClosureFormSchema } from './encoding-closure.schema'
import { EncodingClosureDialog } from './EncodingClosureDialog'

const mocks = vi.hoisted(() => ({
  close: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
}))

vi.mock('@/hooks/use-academic-terms', () => ({
  useCloseAcademicTermEncoding: () => mocks.close,
}))

const term: SchoolTerm = {
  id: '00000000-0000-4000-8000-000000000001',
  start_year: 2026,
  end_year: 2027,
  term_type: '1st Semester',
  school_year: '2026 - 2027',
  is_locked: false,
  override_flag: false,
  starts_on: '2026-08-01',
  ends_on: '2026-12-20',
  encoding_deadline: '2027-01-15',
  default_inc_deadline: '2027-12-20',
  chronological_key: 20261,
}

function renderDialog() {
  const onClose = vi.fn()
  const onComplete = vi.fn()
  render(
    <EncodingClosureDialog
      term={term}
      onClose={onClose}
      onComplete={onComplete}
    />,
  )
  return { onClose, onComplete }
}

function apiError(status: 403 | 409, code: 'FORBIDDEN' | 'CONFLICT') {
  return new ApiClientError(
    normalizeApiError(
      { code, message: 'The term state changed.' },
      new Response(null, { status }),
    ),
  )
}

beforeEach(() => {
  mocks.close.mutateAsync.mockReset().mockResolvedValue(undefined)
  mocks.close.isPending = false
  mocks.close.isError = false
  mocks.close.error = null
})

afterEach(cleanup)

describe('EncodingClosureDialog', () => {
  it('cancels without sending a close request', () => {
    const { onClose } = renderDialog()

    expect(screen.getByText(/first completion of an unresolved INC remains allowed/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(mocks.close.mutateAsync).not.toHaveBeenCalled()
  })

  it('trims and submits the closure note once, then reports success', async () => {
    let resolveMutation: (() => void) | undefined
    mocks.close.mutateAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve
        }),
    )
    const { onComplete } = renderDialog()
    fireEvent.change(screen.getByLabelText('Closure note (optional)'), {
      target: { value: '  Grade review complete.  ' },
    })

    const submit = screen.getByRole('button', { name: 'Close grade encoding' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    await waitFor(() => expect(mocks.close.mutateAsync).toHaveBeenCalledOnce())
    expect(mocks.close.mutateAsync).toHaveBeenCalledWith({
      term,
      closureNote: 'Grade review complete.',
    })
    expect(submit.hasAttribute('disabled')).toBe(true)
    resolveMutation?.()
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it('converts an empty note to null and enforces the contract limit', async () => {
    expect(
      encodingClosureFormSchema.safeParse({
        closure_note: 'N'.repeat(2001),
      }).success,
    ).toBe(false)

    const { onComplete } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Close grade encoding' }))

    await waitFor(() => expect(mocks.close.mutateAsync).toHaveBeenCalledOnce())
    expect(mocks.close.mutateAsync).toHaveBeenCalledWith({
      term,
      closureNote: null,
    })
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it.each([
    [403, 'FORBIDDEN', 'not permitted to close encoding'],
    [409, 'CONFLICT', 'state changed'],
  ] as const)(
    'keeps a %i write denial visible',
    (status, code, message) => {
      mocks.close.isError = true
      mocks.close.error = apiError(status, code)
      renderDialog()

      expect(screen.getByRole('alert').textContent).toContain(message)
    },
  )
})
