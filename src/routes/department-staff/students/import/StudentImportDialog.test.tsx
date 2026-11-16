import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiSchema } from '@/lib/api'
import { STUDENT_IMPORT_HEADERS } from './student-import.schema'
import { StudentImportDialog } from './StudentImportDialog'
import {
  previewStudentImport,
  type StudentImportPreview,
} from './student-import.api'

vi.mock('./student-import.api', () => ({
  previewStudentImport: vi.fn(),
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

function previewResult(
  results: StudentImportPreview['results'],
): StudentImportPreview {
  return {
    mode: 'preview',
    valid_count: results.filter((result) => result.outcome === 'valid').length,
    warning_count: results.filter((result) => result.outcome === 'warning').length,
    error_count: results.filter((result) => result.outcome === 'error').length,
    imported_count: 0,
    results,
  }
}

function validResult(row: ApiSchema<'StudentBatchImportRowInput'>) {
  return {
    row_number: row.row_number,
    student_number: row.student_number,
    email: row.email,
    outcome: 'valid' as const,
    message: 'Validated successfully.',
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
  vi.mocked(previewStudentImport).mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StudentImportDialog server preview', () => {
  it('keeps file selection local until a preview is explicitly requested', async () => {
    vi.mocked(previewStudentImport).mockResolvedValue(
      previewResult([validResult(importRow)]),
    )
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))
    fireEvent.change(screen.getByLabelText('Student file'), {
      target: { files: [csvFile()] },
    })

    expect(
      await screen.findByText('1 of 1 rows passed local and canonical format checks.'),
    ).toBeTruthy()
    expect(previewStudentImport).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Check with server' }))
    expect(await screen.findByText('Server validation results')).toBeTruthy()
    expect(previewStudentImport).toHaveBeenCalledWith(
      [importRow],
      expect.any(AbortSignal),
    )
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('blocks noncanonical new student numbers before sending a preview', async () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))
    fireEvent.change(screen.getByLabelText('Student file'), {
      target: { files: [csvFile('00123')] },
    })

    expect(
      await screen.findByText(/Student number must use YY-N-NNNNN format/),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Check with server' }),
    ).toBeNull()
    expect(previewStudentImport).not.toHaveBeenCalled()
  })

  it('shows server warning and error outcomes separately from valid rows', async () => {
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
    vi.mocked(previewStudentImport).mockResolvedValue(
      previewResult([validResult(importRow), warningRow, errorRow]),
    )
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))
    fireEvent.change(screen.getByLabelText('Student file'), {
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
    fireEvent.click(screen.getByRole('button', { name: 'Check with server' }))

    expect(await screen.findByText('1 valid row, 1 warning, 1 error. No records were imported.')).toBeTruthy()
    expect(
      screen.getByText(/Warnings are not treated as valid or eligible/),
    ).toBeTruthy()
    expect(screen.getByText('Review the provided entry year.')).toBeTruthy()
    expect(screen.getByText('The curriculum is inactive.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /commit|import rows/i })).toBeNull()
  })

  it('aborts and ignores a late preview when a different file is selected', async () => {
    let resolveFirst!: (result: StudentImportPreview) => void
    let firstSignal: AbortSignal | undefined
    vi.mocked(previewStudentImport)
      .mockImplementationOnce((_rows, signal) => {
        firstSignal = signal
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      })
      .mockResolvedValueOnce(
        previewResult([
          validResult({ ...importRow, student_number: '24-1-00126' }),
        ]),
      )
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))
    fireEvent.change(screen.getByLabelText('Student file'), {
      target: { files: [csvFile('24-1-00127', 'first.csv')] },
    })
    await screen.findByText('1 of 1 rows passed local and canonical format checks.')
    fireEvent.click(screen.getByRole('button', { name: 'Check with server' }))
    await waitFor(() => expect(previewStudentImport).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Student file'), {
      target: { files: [csvFile('24-1-00126', 'second.csv')] },
    })
    expect(firstSignal?.aborted).toBe(true)
    await screen.findByText('Selected file: second.csv')
    await screen.findByText('1 of 1 rows passed local and canonical format checks.')
    fireEvent.click(screen.getByRole('button', { name: 'Check with server' }))
    expect(await screen.findByText('24-1-00126')).toBeTruthy()

    resolveFirst(
      previewResult([
        validResult({ ...importRow, student_number: '24-1-00127' }),
      ]),
    )
    await waitFor(() =>
      expect(screen.queryByText('24-1-00127')).toBeNull(),
    )
    expect(previewStudentImport).toHaveBeenCalledTimes(2)
  })

  it('invalidates and aborts a preview when the authorized scope changes', async () => {
    let resolvePreview!: (result: StudentImportPreview) => void
    let signal: AbortSignal | undefined
    vi.mocked(previewStudentImport).mockImplementationOnce((_rows, requestSignal) => {
      signal = requestSignal
      return new Promise((resolve) => {
        resolvePreview = resolve
      })
    })
    const view = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import students' }))
    fireEvent.change(screen.getByLabelText('Student file'), {
      target: { files: [csvFile()] },
    })
    await screen.findByText('1 of 1 rows passed local and canonical format checks.')
    fireEvent.click(screen.getByRole('button', { name: 'Check with server' }))
    await waitFor(() => expect(previewStudentImport).toHaveBeenCalledTimes(1))

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
    expect(signal?.aborted).toBe(true)
    resolvePreview(previewResult([validResult(importRow)]))
    expect(screen.queryByText('Server validation results')).toBeNull()
  })
})
