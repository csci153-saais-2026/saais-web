import { useState } from 'react'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { ApiClientError } from '@/lib/api'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import type {
  DepartmentTermEncoding,
  SchoolTerm,
} from './academic-terms.api'
import { useAcademicTerms } from '@/hooks/use-academic-terms'
import { SchoolTermDialog } from './SchoolTermDialog'
import { EncodingClosureDialog } from './EncodingClosureDialog'
import { OpenedSubjectsPanel } from './OpenedSubjectsPanel'

function termTypeLabel(termType: SchoolTerm['term_type']): string {
  return termType === 'Summer' ? 'Summer/Midyear' : termType
}

function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return 'Not provided'

  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return `Invalid date (${value})`

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatRecordedAt(value: string | null | undefined): string {
  if (!value) return 'Time unavailable'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return `Invalid timestamp (${value})`

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to view academic terms for this department.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the academic term service. Check your connection and retry.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'An unexpected error prevented academic terms from loading.'
}

function TermDetails({
  term,
  closure,
}: {
  term: SchoolTerm
  closure?: DepartmentTermEncoding
}) {
  return (
    <details className="min-w-52">
      <summary
        className="min-h-11 cursor-pointer content-center font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`View details for ${term.school_year}, ${termTypeLabel(term.term_type)}`}
      >
        View term
      </summary>
      <dl className="mt-3 grid gap-2 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">School year</dt>
          <dd className="text-muted-foreground">{term.school_year}</dd>
        </div>
        <div>
          <dt className="font-medium">Term type</dt>
          <dd className="text-muted-foreground">{termTypeLabel(term.term_type)}</dd>
        </div>
        <div>
          <dt className="font-medium">Term dates</dt>
          <dd className="text-muted-foreground">
            {formatCalendarDate(term.starts_on)} – {formatCalendarDate(term.ends_on)}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Encoding deadline</dt>
          <dd className="text-muted-foreground">
            {formatCalendarDate(term.encoding_deadline)}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Institution-wide lock</dt>
          <dd className="text-muted-foreground">
            {term.is_locked ? 'Locked' : 'Not locked'}
          </dd>
          {term.is_locked && (
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded by {term.closed_by_name ?? 'Actor unavailable'} on{' '}
              {formatRecordedAt(term.closed_at)}
            </p>
          )}
        </div>
        <div>
          <dt className="font-medium">Department encoding</dt>
          <dd className="text-muted-foreground">
            {!closure
              ? 'No department-specific record'
              : closure.is_closed
                ? 'Closed'
                : 'Open'}
          </dd>
          {closure?.is_closed && (
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded by {closure.closed_by_name ?? 'Actor unavailable'} on{' '}
              {formatRecordedAt(closure.closed_at)}
            </p>
          )}
        </div>
        {term.closure_note && (
          <div>
            <dt className="font-medium">Institutional closure note</dt>
            <dd className="text-muted-foreground">{term.closure_note}</dd>
          </div>
        )}
        {closure?.closure_note && (
          <div>
            <dt className="font-medium">Department closure note</dt>
            <dd className="text-muted-foreground">{closure.closure_note}</dd>
          </div>
        )}
      </dl>
    </details>
  )
}

export default function AcademicTermsPage() {
  const academicTerms = useAcademicTerms()
  const scope = useStaffScope()
  const [dialogTerm, setDialogTerm] = useState<SchoolTerm | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closureDialogTerm, setClosureDialogTerm] = useState<SchoolTerm | null>(
    null,
  )
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const closures = academicTerms.data?.departmentClosures ?? []
  const closureByTermId = new Map(
    closures.map((closure) => [closure.school_term_id, closure]),
  )

  const columns: Column<SchoolTerm>[] = [
    {
      header: 'Academic year',
      cell: (term) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{term.school_year}</span>
          <span className="text-xs text-muted-foreground">{termTypeLabel(term.term_type)}</span>
        </div>
      ),
    },
    {
      header: 'Term dates',
      cell: (term) => (
        <>
          {formatCalendarDate(term.starts_on)} – {formatCalendarDate(term.ends_on)}
        </>
      ),
    },
    {
      header: 'Encoding deadline',
      cell: (term) => formatCalendarDate(term.encoding_deadline),
    },
    {
      header: 'Institution-wide lock',
      cell: (term) => (
        <span className={term.is_locked ? 'font-medium text-destructive' : 'text-muted-foreground'}>
          {term.is_locked ? 'Locked' : 'Not locked'}
        </span>
      ),
    },
    {
      header: 'Department encoding',
      cell: (term) => {
        const closure = closureByTermId.get(term.id)
        if (!closure) {
          return (
            <span className="text-muted-foreground">
              No department-specific record
            </span>
          )
        }

        return (
          <div className="flex flex-col">
            <span className={closure.is_closed ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              {closure.is_closed ? 'Closed' : 'Open'}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Details',
      cell: (term) => (
        <TermDetails term={term} closure={closureByTermId.get(term.id)} />
      ),
    },
    {
      header: 'Actions',
      cell: (term) => {
        const closure = closureByTermId.get(term.id)
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label={`Edit ${term.school_year} ${termTypeLabel(term.term_type)} academic term`}
              onClick={() => {
                setDialogTerm(term)
                setSaveMessage(null)
                setDialogOpen(true)
              }}
            >
              Edit
            </Button>
            {scope.status === 'ready' && !closure?.is_closed && (
              <Button
                type="button"
                variant="outline"
                aria-label={`Close encoding for ${term.school_year} ${termTypeLabel(term.term_type)}`}
                onClick={() => {
                  setSaveMessage(null)
                  setClosureDialogTerm(term)
                }}
              >
                Close encoding
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeading
        title="Academic terms"
        subtitle="Review calendar dates and the encoding status for your department."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setDialogTerm(null)
                setSaveMessage(null)
                setDialogOpen(true)
              }}
            >
              Add academic term
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void academicTerms.refetch()}
              disabled={academicTerms.isFetching}
            >
              {academicTerms.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {saveMessage && (
        <p role="status" className="text-sm text-muted-foreground">
          {saveMessage}
        </p>
      )}

      {academicTerms.isPending && (
        <Panel title="Academic term history">
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Loading academic terms and department encoding status…
          </p>
        </Panel>
      )}

      {academicTerms.isError && (
        <Panel title="Academic term history">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              {getErrorMessage(academicTerms.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void academicTerms.refetch()}
              disabled={academicTerms.isFetching}
            >
              {academicTerms.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}

      {academicTerms.isSuccess && (
        <>
          <DataTablePanel
            title="Academic term history"
            description="Institution-wide calendar locks and department-specific encoding closures are shown separately."
            columns={columns}
            rows={[...academicTerms.data.terms]}
            rowKey={(term) => term.id}
            empty="No academic terms are available."
            footer={
              <p role="status">
                {academicTerms.data.terms.length} academic term
                {academicTerms.data.terms.length === 1 ? '' : 's'}
              </p>
            }
          />
          <OpenedSubjectsPanel terms={academicTerms.data.terms} />
        </>
      )}

      {dialogOpen && (
        <SchoolTermDialog
          term={dialogTerm ?? undefined}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false)
            setSaveMessage(
              dialogTerm ? 'Academic term updated.' : 'Academic term created.',
            )
          }}
        />
      )}
      {closureDialogTerm && (
        <EncodingClosureDialog
          term={closureDialogTerm}
          onClose={() => setClosureDialogTerm(null)}
          onComplete={() => {
            setClosureDialogTerm(null)
            setSaveMessage(
              `Department grade encoding closed for ${closureDialogTerm.school_year}, ${termTypeLabel(closureDialogTerm.term_type)}.`,
            )
          }}
        />
      )}
    </div>
  )
}
