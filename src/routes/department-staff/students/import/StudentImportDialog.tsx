import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FlagIcon, UploadIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormField } from '@/components/features/form-field'
import { ApiClientError } from '@/lib/api'
import { useStudentImportCommit, type StudentImportScope } from '@/hooks/use-student-import'
import { staffQueryKeys } from '../../shared/staff-query-keys'
import {
  MAX_STUDENT_IMPORT_FILE_SIZE,
  MAX_STUDENT_IMPORT_ROWS,
} from './student-import.schema'
import {
  parseStudentFile,
  type StudentImportIssue,
  type StudentImportParseResult,
} from './parse-student-file'
import { ImportPreviewTable } from './ImportPreviewTable'
import type { StudentImportBatchResult } from './student-import.api'

const FILE_SIZE_LABEL = `${MAX_STUDENT_IMPORT_FILE_SIZE / (1024 * 1024)} MiB`
const STUDENT_NUMBER_PATTERN = /^\d{2}-\d-\d{5}$/
const validationExamples = [
  { rowNumber: 2, studentNumber: '24-1-00124', result: 'Ready', valid: true },
  {
    rowNumber: 3,
    studentNumber: '2024-218',
    result: 'Invalid ID format',
    valid: false,
  },
  {
    rowNumber: 4,
    studentNumber: '24-1-00124',
    result: 'Duplicate ID',
    valid: false,
  },
]

function getLocalErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The selected file could not be read.'
}

function getImportErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to import students for this department.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the student import service. Check your connection and retry.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error prevented the student import from completing.'
}

function getCanonicalNumberIssues(
  parsed: StudentImportParseResult | null,
): StudentImportIssue[] {
  if (!parsed) return []
  const seenNumbers = new Set<string>()
  return parsed.rows.flatMap((row) => {
    const issues: StudentImportIssue[] = []
    if (!STUDENT_NUMBER_PATTERN.test(row.student_number)) {
      issues.push({
        rowNumber: row.row_number,
        message: 'Invalid ID format.',
      })
    }
    if (seenNumbers.has(row.student_number)) {
      issues.push({ rowNumber: row.row_number, message: 'Duplicate ID.' })
    }
    seenNumbers.add(row.student_number)
    return issues
  })
}

function LocalValidationTable({
  parsed,
  issues,
  isParsing,
  showExamples,
}: {
  parsed: StudentImportParseResult | null
  issues: readonly StudentImportIssue[]
  isParsing: boolean
  showExamples: boolean
}) {
  const rows = new Map<
    number,
    { studentNumber: string; messages: string[] }
  >()

  for (const row of parsed?.rows ?? []) {
    rows.set(row.row_number, { studentNumber: row.student_number, messages: [] })
  }
  for (const issue of issues) {
    if (issue.rowNumber === null) continue
    const row = rows.get(issue.rowNumber) ?? { studentNumber: '—', messages: [] }
    row.messages.push(issue.message)
    rows.set(issue.rowNumber, row)
  }

  return (
    <div className="max-h-64 overflow-auto border-y">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          {showExamples
            ? 'Example validation outcomes; these rows are not part of the selected file.'
            : 'Local student import validation results'}
        </caption>
        <thead className="sticky top-0 bg-cream-deep text-xs uppercase tracking-wider text-muted-2">
          <tr>
            <th scope="col" className="px-4 py-3">Row</th>
            <th scope="col" className="px-4 py-3">Student ID</th>
            <th scope="col" className="px-4 py-3">Result</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {rows.size === 0 ? (
            showExamples ? (
              validationExamples.map((example) => (
                <tr key={example.rowNumber} className="border-t border-border">
                  <td className="px-4 py-3">{example.rowNumber}</td>
                  <td className="px-4 py-3">{example.studentNumber}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        example.valid
                          ? 'inline-flex items-center gap-1.5 rounded-sm bg-[var(--status-pass-bg)] px-2 py-1 font-semibold text-[var(--status-pass)]'
                          : 'inline-flex items-center gap-1.5 rounded-sm bg-[var(--status-fail-bg)] px-2 py-1 font-semibold text-[var(--status-fail)]'
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          example.valid
                            ? 'size-2 rounded-full bg-[var(--status-pass)]'
                            : 'size-2 rounded-full bg-[var(--status-fail)]'
                        }
                      />
                      {example.result}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="h-24 px-4 text-center text-muted-foreground">
                  {isParsing
                    ? 'Checking the selected spreadsheet…'
                    : 'Choose a spreadsheet to validate its rows.'}
                </td>
              </tr>
            )
          ) : (
            [...rows.entries()].sort(([a], [b]) => a - b).map(([rowNumber, row]) => (
              <tr key={rowNumber} className="border-t border-border">
                <td className="px-4 py-3">{rowNumber}</td>
                <td className="px-4 py-3">{row.studentNumber}</td>
                <td className="px-4 py-3">
                  {row.messages.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--status-pass-bg)] px-2 py-1 font-semibold text-[var(--status-pass)]">
                      <span aria-hidden="true" className="size-2 rounded-full bg-[var(--status-pass)]" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--status-fail-bg)] px-2 py-1 font-semibold text-[var(--status-fail)]">
                      <span aria-hidden="true" className="size-2 rounded-full bg-[var(--status-fail)]" />
                      {row.messages.join(' ')}
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function StudentImportDialog({
  scope,
}: {
  scope: StudentImportScope | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<StudentImportParseResult | null>(null)
  const [importResult, setImportResult] = useState<StudentImportBatchResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const parseGeneration = useRef(0)
  const importGeneration = useRef(0)
  const importAbortController = useRef<AbortController | null>(null)
  const scopeKey = scope
    ? `${scope.profileId}:${scope.departmentId}`
    : null
  const previousScopeKey = useRef(scopeKey)
  const importMutation = useStudentImportCommit(scope)
  const queryClient = useQueryClient()
  const canonicalIssues = getCanonicalNumberIssues(parsed)
  const localIssues = parsed
    ? [...parsed.issues, ...canonicalIssues]
    : []
  const hasFileLevelIssue = localIssues.some((issue) => issue.rowNumber === null)
  const importableRows = hasFileLevelIssue
    ? []
    : (parsed?.rows ?? []).filter(
        (row) => !localIssues.some((issue) => issue.rowNumber === row.row_number),
      )

  const invalidateImport = useCallback(() => {
    importGeneration.current += 1
    importAbortController.current?.abort()
    importAbortController.current = null
    setIsImporting(false)
    setImportResult(null)
    setImportError(null)
  }, [])

  useEffect(() => {
    if (previousScopeKey.current === scopeKey) return
    previousScopeKey.current = scopeKey
    if (isImporting) return
    // Scope changes invalidate transient file/preview state created for the previous department.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    invalidateImport()
  }, [invalidateImport, isImporting, scopeKey])

  useEffect(
    () => () => {
      parseGeneration.current += 1
      importGeneration.current += 1
      importAbortController.current?.abort()
    },
    [],
  )

  async function selectFile(file: File | undefined) {
    if (isImporting) return
    const generation = ++parseGeneration.current
    invalidateImport()
    setFileName(file?.name ?? '')
    setLocalError(null)
    setParsed(null)
    if (!file) {
      setIsParsing(false)
      return
    }

    setIsParsing(true)
    try {
      const result = await parseStudentFile(file)
      if (generation === parseGeneration.current) setParsed(result)
    } catch (parseError) {
      if (generation === parseGeneration.current) {
        setLocalError(getLocalErrorMessage(parseError))
      }
    } finally {
      if (generation === parseGeneration.current) setIsParsing(false)
    }
  }

  async function requestImport() {
    if (!importableRows.length || !scope || importResult) return
    invalidateImport()
    const generation = importGeneration.current
    const controller = new AbortController()
    importAbortController.current = controller
    setIsImporting(true)

    try {
      const result = await importMutation.mutateAsync({
        rows: importableRows,
        signal: controller.signal,
      })
      if (generation === importGeneration.current) {
        setImportResult(result)
        if (result.imported_count > 0 && scope) {
          void queryClient.invalidateQueries({
            queryKey: staffQueryKeys.resource(
              scope.profileId,
              scope.departmentId,
              'students',
            ),
          })
        }
      }
    } catch (error) {
      if (generation === importGeneration.current && !controller.signal.aborted) {
        setImportError(getImportErrorMessage(error))
      }
    } finally {
      if (generation === importGeneration.current) {
        importAbortController.current = null
        setIsImporting(false)
      }
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && isImporting) return
    setIsOpen(open)
    if (open) return

    parseGeneration.current += 1
    invalidateImport()
    setIsParsing(false)
    setFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setLocalError(null)
    setParsed(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <UploadIcon />
          Import spreadsheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-md p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-[18px] pr-14">
          <DialogTitle className="font-heading text-[24px] leading-[1.08] font-bold tracking-[-0.01em]">
            Import students from spreadsheet
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 space-y-6 overflow-y-auto p-6">
          <div className="flex items-center gap-4 rounded-md border border-[var(--notice-advisory-border)] bg-[var(--notice-advisory-bg)] px-5 py-4 text-sm text-[var(--notice-advisory)]">
            <FlagIcon className="size-5 shrink-0" />
            <p>
              Required columns: student name, student ID, school email,
              curriculum, and adviser.
            </p>
          </div>

          <FormField
            label="Spreadsheet file"
            htmlFor="student-import-file"
            hint="XLSX or CSV · IDs must follow YY-N-NNNNN (example: 24-1-00124)."
          >
            <input
              id="student-import-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              disabled={isImporting}
              aria-describedby="student-import-guidance"
              className="block min-h-[54px] w-full rounded-sm border border-border bg-background px-4 py-3 font-sans text-body font-semibold file:mr-2 file:inline-flex file:appearance-auto file:items-center file:rounded-sm file:border file:border-solid file:border-[#767676] file:bg-[#efefef] file:px-2 file:py-0 file:font-sans file:text-base file:font-normal file:text-foreground hover:file:bg-[#e7e7e7]"
              onChange={(event) =>
                void selectFile(event.currentTarget.files?.[0])
              }
            />
          </FormField>
          <p id="student-import-guidance" className="sr-only">
            Maximum {FILE_SIZE_LABEL}, up to {MAX_STUDENT_IMPORT_ROWS} student rows. The first
            worksheet is used for XLSX files. Required columns are student_number,
            full_name, email, program_id, curriculum_version_id, and adviser_id;
            entry_year is optional.
          </p>

          <section aria-label="Validation preview" className="space-y-3">
            <h3 className="text-heading font-semibold">Validation example</h3>
            {isParsing && (
              <p role="status" className="text-sm text-muted-foreground">
                Checking file locally…
              </p>
            )}
            {localError && (
              <p role="alert" className="text-sm text-destructive">
                {localError}
              </p>
            )}
            <LocalValidationTable
              parsed={parsed}
              issues={localIssues}
              isParsing={isParsing}
              showExamples={!fileName && !localError && !isParsing}
            />
            {parsed && (
              <>
              <p role="status" className="text-sm text-muted-foreground">
                {importableRows.length} of{' '}
              {parsed.rowCount} rows passed local and canonical format checks.
              </p>
                <p className="text-xs text-muted-foreground">
                  Reference existence and eligibility are checked by the server.
                </p>
              </>
            )}
            {localIssues.some((issue) => issue.rowNumber === null) && (
              <p role="alert" className="text-sm text-destructive">
                {localIssues
                  .filter((issue) => issue.rowNumber === null)
                  .map((issue) => issue.message)
                  .join(' ')}
              </p>
            )}
            {localIssues.length > 0 && (
              <p role="alert" className="text-sm text-destructive">
                Invalid rows are excluded. Only locally valid rows are sent to
                the server for import.
              </p>
            )}
            {importError && (
              <p role="alert" className="text-sm text-destructive">
                {importError}
              </p>
            )}
            {isImporting && (
              <p role="status" className="text-sm text-muted-foreground">
                Importing valid rows…
              </p>
            )}
            {importResult && <ImportPreviewTable result={importResult} />}
            {scope === null && parsed && (
              <p role="alert" className="text-sm text-destructive">
                Authorized department scope is unavailable. The file remains
                local and cannot be imported.
              </p>
            )}
          </section>
          <p className="text-xs text-muted-foreground">
            Columns: student name, student ID, school email, curriculum,
            adviser. Choose an .xlsx or CSV file.
          </p>
        </div>
        <div className="border-t border-border px-6 py-4">
          <DialogFooter className="flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void requestImport()}
              disabled={
                !parsed ||
                importableRows.length === 0 ||
                !scope ||
                isParsing ||
                isImporting ||
                Boolean(importResult)
              }
            >
              {isImporting
                ? 'Importing…'
                : importResult
                  ? 'Import complete'
                  : 'Import valid rows'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
