import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { STUDENT_IMPORT_HEADERS } from './student-import.schema'
import { StudentImportDialog } from './StudentImportDialog'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StudentImportDialog', () => {
  it('parses a selected file locally and closes without sending a request', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<StudentImportDialog />)

    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))
    const file = new File(
      [
        `${STUDENT_IMPORT_HEADERS.join(',')}\n00123,Maria Santos,maria@example.edu.ph,11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222,33333333-3333-4333-8333-333333333333,2026`,
      ],
      'students.csv',
      { type: 'text/csv' },
    )
    fireEvent.change(screen.getByLabelText('Student file'), {
      target: { files: [file] },
    })

    expect(
      await screen.findByText('1 of 1 rows passed local format checks.'),
    ).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('offers the template without exposing an import submission action', () => {
    render(<StudentImportDialog />)
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))

    expect(screen.getByRole('button', { name: 'Download CSV template' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /upload|submit|import rows/i })).toBeNull()
  })
})
