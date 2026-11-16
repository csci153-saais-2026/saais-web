import type { StudentImportPreview } from './student-import.api'

const outcomeLabels: Record<
  StudentImportPreview['results'][number]['outcome'],
  string
> = {
  valid: 'Valid',
  warning: 'Warning',
  error: 'Error',
  imported: 'Imported',
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}

export function ImportPreviewTable({
  preview,
}: {
  preview: StudentImportPreview
}) {
  return (
    <section aria-label="Server import preview" className="space-y-3">
      <h3 className="font-semibold">Server validation results</h3>
      <p role="status" className="text-sm">
        {countLabel(preview.valid_count, 'valid row')},{' '}
        {countLabel(preview.warning_count, 'warning')},{' '}
        {countLabel(preview.error_count, 'error')}. No records were imported.
      </p>
      {preview.warning_count > 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          Warnings are not treated as valid or eligible. Review and correct
          warning rows before continuing.
        </p>
      )}
      <div className="max-h-64 overflow-auto rounded-md border">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Server validation outcomes for student import rows
          </caption>
          <thead className="sticky top-0 bg-muted text-foreground">
            <tr>
              <th scope="col" className="p-3">Row</th>
              <th scope="col" className="p-3">Student number</th>
              <th scope="col" className="p-3">Email</th>
              <th scope="col" className="p-3">Outcome</th>
              <th scope="col" className="p-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {preview.results.map((result) => (
              <tr
                key={`${result.row_number}-${result.student_number}`}
                className="border-t"
              >
                <td className="p-3">{result.row_number}</td>
                <td className="p-3">{result.student_number}</td>
                <td className="p-3">{result.email}</td>
                <td className="p-3">{outcomeLabels[result.outcome]}</td>
                <td className="p-3">{result.message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
