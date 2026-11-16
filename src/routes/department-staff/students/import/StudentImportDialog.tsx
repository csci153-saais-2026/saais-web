import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormField } from '@/components/features/form-field'
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

const FILE_SIZE_LABEL = `${MAX_STUDENT_IMPORT_FILE_SIZE / (1024 * 1024)} MiB`

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The selected file could not be read.'
}

function downloadTemplate() {
  const url = URL.createObjectURL(createStudentImportTemplate())
  const link = document.createElement('a')
  link.href = url
  link.download = 'student_import_template.csv'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
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

export function StudentImportDialog() {
  const [isParsing, setIsParsing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<StudentImportParseResult | null>(null)

  async function selectFile(file: File | undefined, input: HTMLInputElement) {
    input.value = ''
    setFileName(file?.name ?? '')
    setError(null)
    setResult(null)
    if (!file) return

    setIsParsing(true)
    try {
      setResult(await parseStudentFile(file))
    } catch (parseError) {
      setError(getErrorMessage(parseError))
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <Dialog>
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
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {result && (
            <section aria-label="Local import validation results" className="space-y-3">
              <p role="status" className="text-sm">
                {result.rows.length} of {result.rowCount} rows passed local
                format checks.
              </p>
              <p className="text-sm text-muted-foreground">
                These checks do not confirm whether records already exist or
                whether the selected references are active and eligible.
              </p>
              {result.issues.length > 0 && (
                <ImportIssues issues={result.issues} />
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
