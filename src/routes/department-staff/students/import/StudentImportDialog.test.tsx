import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiSchema } from '@/lib/api'
import { STUDENT_IMPORT_HEADERS } from './student-import.schema'
import { StudentImportDialog } from './StudentImportDialog'
import {
  commitStudentImport,
  type StudentImportBatchResult,
} from './student-import.api'

vi.mock('./student-import.api', () => ({
  commitStudentImport: vi.fn(),
}))

const PROFILE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DEPARTMENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const PROGRAM_ID = '11111111-1111-4111-8111-111111111111'
const CURRICULUM_ID = '22222222-2222-4222-8222-222222222222'
const ADVISER_ID = '33333333-3333-4333-8333-333333333333'
const STUDENT_NUMBER = '24-1-00123'
const scope = { profileId: PROFILE_ID, departmentId: DEPARTMENT_ID }

const importRow: ApiSchema<'StudentBatchImportRowInput'> = {
  row_number: 2,
  student_number: STUDENT_NUMBER,
  full_name: 'Maria Santos',
  email: 'maria@example.edu.ph',
  program_id: PROGRAM_ID,
  curriculum_version_id: CURRICULUM_ID,
  adviser_id: ADVISER_ID,
  entry_year: 2026,
}

function csvFile(
  studentNumber = STUDENT_NUMBER,
  name = 'students.csv',
  additionalStudentNumbers: readonly string[] = [],
): File {
  const rows = [studentNumber, ...additionalStudentNumbers].map(
    (number, index) =>
      [
        number,
        index === 0 ? 'Maria Santos' : `Student ${index}`,
        index === 0 ? 'maria@example.edu.ph' : `student${index}@example.edu.ph`,
        PROGRAM_ID,
        CURRICULUM_ID,
        ADVISER_ID,
        '2026',
      ].join(','),
  )
  return new File(
    [`${STUDENT_IMPORT_HEADERS.join(',')}\n${rows.join('\n')}`],
    name,
    { type: 'text/csv' },
  )
}

function commitResult(
  results: StudentImportBatchResult['results'],
): StudentImportBatchResult {
  return {
    mode: 'commit',
    valid_count: results.filter((result) => result.outcome === 'imported').length,
    warning_count: results.filter((result) => result.outcome === 'warning').length,
    error_count: results.filter((result) => result.outcome === 'error').length,
    imported_count: results.filter((result) => result.outcome === 'imported').length,
    results,
  }
}

function validResult(row: ApiSchema<'StudentBatchImportRowInput'>) {
  return {
    row_number: row.row_number,
    student_number: row.student_number,
    email: row.email,
    outcome: 'imported' as const,
    message: 'Imported successfully.',
  }
}

function renderDialog(
  dialogScope: typeof scope | null = scope,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <StudentImportDialog scope={dialogScope} />
      </QueryClientProvider>,
    ),
    queryClient,
  }
}

beforeEach(() => {
  vi.mocked(commitStudentImport).mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StudentImportDialog student import', () => {
  it('keeps file selection local until valid rows are explicitly imported', async () => {
    vi.mocked(commitStudentImport).mockResolvedValue(
      commitResult([validResult(importRow)]),
    )
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    expect(screen.getByRole('heading', { name: 'Import students from spreadsheet' })).toBeTruthy()
    expect(screen.getByText(/Required columns:/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Validation example' })).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    const dialogChildren = Array.from(dialog.children)
    const scrollContent = dialogChildren[1] as HTMLElement
    const footer = dialogChildren[2] as HTMLElement
    expect(dialogChildren[0].getAttribute('data-slot')).toBe('dialog-header')
    expect(scrollContent.className).toContain('overflow-y-auto')
    expect(footer.className).toContain('border-t')
    expect(footer.contains(screen.getByRole('button', { name: 'Cancel' }))).toBe(true)
    expect(scrollContent.contains(screen.getByRole('button', { name: 'Cancel' }))).toBe(false)
    const fileInput = screen.getByLabelText('Spreadsheet file') as HTMLInputElement
    expect(fileInput.className).toContain('file:bg-[#efefef]')
    expect(fileInput.className).toContain('file:border-[#767676]')
    expect(fileInput.className).toContain('font-semibold')
    expect(screen.getByText('2024-218')).toBeTruthy()
    expect(screen.getByText('Invalid ID format')).toBeTruthy()
    expect(screen.getByText('Duplicate ID')).toBeTruthy()
    expect(
      screen
        .getByRole('table', { name: /example validation outcomes/i })
        .querySelector('tbody')?.className,
    ).toContain('text-xs')
    expect((screen.getByRole('button', { name: 'Import valid rows' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: { files: [csvFile()] },
    })

    expect(
      await screen.findByText('1 of 1 rows passed local and canonical format checks.'),
    ).toBeTruthy()
    expect(fileInput.files?.[0]?.name).toBe('students.csv')
    expect(screen.queryByText(/Selected file:/)).toBeNull()
    expect(screen.queryByText('2024-218')).toBeNull()
    expect(screen.queryByText('Duplicate ID')).toBeNull()
    expect(commitStudentImport).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))
    expect(await screen.findByText('Import results')).toBeTruthy()
    expect(commitStudentImport).toHaveBeenCalledWith(
      [importRow],
      expect.any(AbortSignal),
    )
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('blocks a row with an invalid student number before importing', async () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: { files: [csvFile('00123')] },
    })

    expect(
      await screen.findByText(/Invalid ID format/),
    ).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Import valid rows' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(commitStudentImport).not.toHaveBeenCalled()
  })

  it('imports only locally valid rows when a file also has invalid rows', async () => {
    vi.mocked(commitStudentImport).mockResolvedValue(
      commitResult([validResult(importRow)]),
    )
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: { files: [csvFile(STUDENT_NUMBER, 'students.csv', ['00124'])] },
    })

    expect(
      await screen.findByText('1 of 2 rows passed local and canonical format checks.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))

    expect(await screen.findByText('Import results')).toBeTruthy()
    expect(commitStudentImport).toHaveBeenCalledWith(
      [importRow],
      expect.any(AbortSignal),
    )
  })

  it('shows server warning and error outcomes separately from imported rows', async () => {
    const warningRow = {
      ...validResult(importRow),
      row_number: 3,
      student_number: '24-1-00124',
      email: 'student1@example.edu.ph',
      outcome: 'warning' as const,
      message: 'Review the provided entry year.',
    }
    const errorRow = {
      ...validResult(importRow),
      row_number: 4,
      student_number: '24-1-00125',
      email: 'student2@example.edu.ph',
      outcome: 'error' as const,
      message: 'The curriculum is inactive.',
    }
    vi.mocked(commitStudentImport).mockResolvedValue(
      commitResult([validResult(importRow), warningRow, errorRow]),
    )
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: {
        files: [
          csvFile(STUDENT_NUMBER, 'students.csv', [
            '24-1-00124',
            '24-1-00125',
          ]),
        ],
      },
    })
    await screen.findByText('3 of 3 rows passed local and canonical format checks.')
    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))

    expect(await screen.findByText('1 student imported. 1 warning, 1 error.')).toBeTruthy()
    expect(
      screen.getByText(/1 row needs review/),
    ).toBeTruthy()
    expect(screen.getByText('Review the provided entry year.')).toBeTruthy()
    expect(screen.getByText('The curriculum is inactive.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /commit|import rows/i })).toBeNull()
  })

  it('keeps the active commit intact while file and close controls are disabled', async () => {
    let resolveImport!: (result: StudentImportBatchResult) => void
    let importSignal: AbortSignal | undefined
    vi.mocked(commitStudentImport).mockImplementationOnce((_rows, signal) => {
      importSignal = signal
      return new Promise((resolve) => {
        resolveImport = resolve
      })
    })
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: { files: [csvFile('24-1-00127', 'first.csv')] },
    })
    await screen.findByText('1 of 1 rows passed local and canonical format checks.')
    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))
    await waitFor(() => expect(commitStudentImport).toHaveBeenCalledTimes(1))

    const fileInput = screen.getByLabelText('Spreadsheet file') as HTMLInputElement
    expect(fileInput.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: { files: [csvFile('24-1-00126', 'second.csv')] },
    })
    expect(importSignal?.aborted).toBe(false)
    expect(screen.queryByText(/Selected file:/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    resolveImport(commitResult([validResult(importRow)]))
    expect(await screen.findByText('Import results')).toBeTruthy()
    expect(fileInput.disabled).toBe(false)
  })

  it('does not abort an active import when the authorized scope changes', async () => {
    let resolveImport!: (result: StudentImportBatchResult) => void
    let signal: AbortSignal | undefined
    vi.mocked(commitStudentImport).mockImplementationOnce((_rows, requestSignal) => {
      signal = requestSignal
      return new Promise((resolve) => {
        resolveImport = resolve
      })
    })
    const view = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), {
      target: { files: [csvFile()] },
    })
    await screen.findByText('1 of 1 rows passed local and canonical format checks.')
    fireEvent.click(screen.getByRole('button', { name: 'Import valid rows' }))
    await waitFor(() => expect(commitStudentImport).toHaveBeenCalledTimes(1))

    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <StudentImportDialog
          scope={{
            profileId: PROFILE_ID,
            departmentId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          }}
        />
      </QueryClientProvider>,
    )
    expect(signal?.aborted).toBe(false)
    resolveImport(commitResult([validResult(importRow)]))
    expect(await screen.findByText('Import results')).toBeTruthy()
  })
})
