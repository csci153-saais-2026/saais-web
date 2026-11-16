import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormField } from '@/components/features/form-field'
import { ApiClientError } from '@/lib/api'
import { useStudentImportPreview, type StudentImportScope } from '@/hooks/use-student-import'
import {
  MAX_STUDENT_IMPORT_FILE_SIZE,
  MAX_STUDENT_IMPORT_ROWS,
  STUDENT_IMPORT_HEADERS,
} from './student-import.schema'
import {
  createStudentImportTemplate,
  parseStudentFile,
  type StudentImportIssue,
  type StudentImportParseResult,
} from './parse-student-file'
import { ImportPreviewTable } from './ImportPreviewTable'
import type { StudentImportPreview } from './student-import.api'

const FILE_SIZE_LABEL = `${MAX_STUDENT_IMPORT_FILE_SIZE / (1024 * 1024)} MiB`
const STUDENT_NUMBER_PATTERN = /^\d{2}-\d-\d{5}$/

function getLocalErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The selected file could not be read.'
}

function getPreviewErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to preview student imports for this department.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the student import preview service. Check your connection and retry.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error prevented the student import preview from loading.'
}

function downloadTemplate() {
  const url = URL.createObjectURL(createStudentImportTemplate())
  const link = document.createElement('a')
  link.href = url
  link.download = 'student_import_template.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function getCanonicalNumberIssues(
  parsed: StudentImportParseResult | null,
): StudentImportIssue[] {
  if (!parsed) return []
  return parsed.rows.flatMap((row) =>
    STUDENT_NUMBER_PATTERN.test(row.student_number)
      ? []
      : [{
          rowNumber: row.row_number,
          message: 'Student number must use YY-N-NNNNN format.',
        }],
  )
}

function ImportIssues({ issues }: { issues: readonly StudentImportIssue[] }) {
  return (
    <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3 text-sm">
      {issues.map((issue, index) => (
        <li key={`${issue.rowNumber ?? 'file'}-${index}`}>
          {issue.rowNumber === null ? 'File' : `Row ${issue.rowNumber}`}: {issue.message}
        </li>
      ))}
    </ul>
  )
}

export function StudentImportDialog({
  scope,
}: {
  scope: StudentImportScope | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<StudentImportParseResult | null>(null)
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const parseGeneration = useRef(0)
  const previewGeneration = useRef(0)
  const previewAbortController = useRef<AbortController | null>(null)
  const scopeKey = scope
    ? `${scope.profileId}:${scope.departmentId}`
    : null
  const previousScopeKey = useRef(scopeKey)
  const previewMutation = useStudentImportPreview(scope)
  const canonicalIssues = getCanonicalNumberIssues(parsed)
  const localIssues = parsed
    ? [...parsed.issues, ...canonicalIssues]
    : []

  const invalidatePreview = useCallback(() => {
    previewGeneration.current += 1
    previewAbortController.current?.abort()
    previewAbortController.current = null
    setIsPreviewing(false)
    setPreview(null)
    setPreviewError(null)
  }, [])

  useEffect(() => {
    if (previousScopeKey.current === scopeKey) return
    previousScopeKey.current = scopeKey
    invalidatePreview()
  }, [invalidatePreview, scopeKey])

  useEffect(
    () => () => {
      parseGeneration.current += 1
      previewGeneration.current += 1
      previewAbortController.current?.abort()
    },
    [],
  )

  async function selectFile(file: File | undefined, input: HTMLInputElement) {
    input.value = ''
    const generation = ++parseGeneration.current
    invalidatePreview()
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

  async function requestPreview() {
    if (!parsed || localIssues.length > 0 || !scope) return
    invalidatePreview()
    const generation = previewGeneration.current
    const controller = new AbortController()
    previewAbortController.current = controller
    setIsPreviewing(true)

    try {
      const result = await previewMutation.mutateAsync({
        rows: parsed.rows,
        signal: controller.signal,
      })
      if (generation === previewGeneration.current) setPreview(result)
    } catch (error) {
      if (generation === previewGeneration.current && !controller.signal.aborted) {
        setPreviewError(getPreviewErrorMessage(error))
      }
    } finally {
      if (generation === previewGeneration.current) {
        previewAbortController.current = null
        setIsPreviewing(false)
      }
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open) return

    parseGeneration.current += 1
    invalidatePreview()
    setIsParsing(false)
    setFileName('')
    setLocalError(null)
    setParsed(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Import students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prepare student import</DialogTitle>
          <DialogDescription>
            Choose a CSV or XLSX file to check its format in this browser.
            Selecting a file does not send or save student records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            Download CSV template
          </Button>

          <FormField
            label="Student file"
            htmlFor="student-import-file"
            hint={`Maximum file size: ${FILE_SIZE_LABEL}. Up to ${MAX_STUDENT_IMPORT_ROWS} student rows.`}
          >
            <input
              id="student-import-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              aria-describedby="student-import-guidance"
              className="block min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
              onChange={(event) =>
                void selectFile(event.currentTarget.files?.[0], event.currentTarget)
              }
            />
          </FormField>
          <p id="student-import-guidance" className="text-sm text-muted-foreground">
            Columns: {STUDENT_IMPORT_HEADERS.join(', ')}. The first worksheet
            is used for XLSX files. Reference IDs are checked for UUID format;
            their existence and eligibility are not verified locally.
          </p>

          {fileName && (
            <p className="break-all text-sm" aria-live="polite">
              Selected file: {fileName}
            </p>
          )}
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
          {parsed && (
            <section
              aria-label="Local import validation results"
              className="space-y-3"
            >
              <p role="status" className="text-sm">
                {Math.max(0, parsed.rows.length - canonicalIssues.length)} of{' '}
                {parsed.rowCount} rows passed local and canonical format checks.
              </p>
              <p className="text-sm text-muted-foreground">
                These checks do not confirm whether records already exist or
                whether the selected references are active and eligible.
              </p>
              {localIssues.length > 0 && (
                <>
                  <p role="alert" className="text-sm text-destructive">
                    Correct the listed rows and select the corrected file
                    before requesting a server preview. Partial files are not
                    previewed.
                  </p>
                  <ImportIssues issues={localIssues} />
                </>
              )}
            </section>
          )}
          {previewError && (
            <p role="alert" className="text-sm text-destructive">
              {previewError}
            </p>
          )}
          {isPreviewing && (
            <p role="status" className="text-sm text-muted-foreground">
              Validating rows with the server…
            </p>
          )}
          {preview && <ImportPreviewTable preview={preview} />}
          {scope === null && parsed && (
            <p role="alert" className="text-sm text-destructive">
              Authorized department scope is unavailable. The file remains
              local and cannot be sent for preview.
            </p>
          )}
          {parsed && localIssues.length === 0 && (
            <Button
              type="button"
              onClick={() => void requestPreview()}
              disabled={!scope || isParsing || isPreviewing}
            >
              {isPreviewing
                ? 'Checking with server…'
                : previewError
                  ? 'Retry server preview'
                  : 'Check with server'}
            </Button>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
