import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiSchema } from '@/lib/api'
import { STUDENT_IMPORT_HEADERS } from './student-import'
import { StudentImportDialog } from './StudentImportDialog'
import {
  commitStudentImport,
  previewStudentImport,
  type StudentImportBatchResult,
} from './student-import.api'

vi.mock('./student-import', async (importOriginal) => ({ ...await importOriginal<typeof import('./student-import')>(), loadImportReferences: vi.fn(async () => ({ programs: [{ id: '11111111-1111-4111-8111-111111111111', code: '11111111-1111-4111-8111-111111111111' }], curricula: [{ id: '22222222-2222-4222-8222-222222222222', program_id: '11111111-1111-4111-8111-111111111111', version_label: '22222222-2222-4222-8222-222222222222' }], advisers: [{ id: '33333333-3333-4333-8333-333333333333', email: '33333333-3333-4333-8333-333333333333' }] })) }))

vi.mock('./student-import.api', () => ({
  commitStudentImport: vi.fn(),
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
  vi.mocked(previewStudentImport).mockReset()
  vi.mocked(previewStudentImport).mockImplementation(async (rows) => ({ mode: 'preview', valid_count: rows.length, warning_count: 0, error_count: 0, imported_count: 0, results: rows.map((row) => ({ row_number: row.row_number, student_number: row.student_number, email: row.email, outcome: 'valid' as const, message: '' })) }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('StudentImportDialog', () => {
  it('previews every row before allowing import', async () => {
    vi.mocked(commitStudentImport).mockResolvedValue(commitResult([validResult(importRow)]))
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    expect(screen.getByRole('link', { name: 'Download sample spreadsheet' }).getAttribute('download')).toBe('student-import-sample.csv')
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), { target: { files: [csvFile()] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Import 1 student' }))
    await screen.findByText('Import results')
    expect(previewStudentImport).toHaveBeenCalledWith([importRow])
    expect(commitStudentImport).toHaveBeenCalledWith([importRow], expect.any(AbortSignal))
  })
  it('blocks the whole file when any row is invalid', async () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), { target: { files: [csvFile(STUDENT_NUMBER, 'students.csv', ['00124'])] } })
    expect(await screen.findByText(/Nothing is imported until every row is valid/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Import students' }) as HTMLButtonElement).disabled).toBe(true)
    expect(previewStudentImport).not.toHaveBeenCalled()
    expect(commitStudentImport).not.toHaveBeenCalled()
  })
  it('blocks import when the server preview rejects a row', async () => {
    vi.mocked(previewStudentImport).mockResolvedValue({ mode: 'preview', valid_count: 0, warning_count: 0, error_count: 1, imported_count: 0, results: [{ row_number: 2, student_number: STUDENT_NUMBER, email: importRow.email, outcome: 'error', message: 'Student already exists' }] })
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Import spreadsheet' }))
    fireEvent.change(screen.getByLabelText('Spreadsheet file'), { target: { files: [csvFile()] } })
    expect(await screen.findByText('Student already exists')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Import students' }) as HTMLButtonElement).disabled).toBe(true)
    expect(commitStudentImport).not.toHaveBeenCalled()
  })
})
