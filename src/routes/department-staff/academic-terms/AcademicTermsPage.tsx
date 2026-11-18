import { useState } from 'react'
import { AlertIcon, PlusIcon } from '@/components/icons'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiClientError } from '@/lib/api'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { useAcademicTerms } from '@/hooks/use-academic-terms'
import type {
  DepartmentTermEncoding,
  SchoolTerm,
} from './academic-terms.api'
import { SchoolTermDialog } from './SchoolTermDialog'
import {
  EncodingClosureDialog,
  type EncodingClosureDialogMode,
} from './EncodingClosureDialog'

function termTypeLabel(termType: SchoolTerm['term_type']): string {
  return termType === 'Summer' ? 'Summer/Midyear' : termType
}

function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return 'Not provided'

  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return `Invalid date (${value})`

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
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
  onEdit,
  onReopen,
}: {
  term: SchoolTerm
  closure?: DepartmentTermEncoding
  onEdit: () => void
  onReopen: () => void
}) {
  return (
    <details className="min-w-28">
      <summary
        className="min-h-9 cursor-pointer content-center font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`View details for ${term.school_year}, ${termTypeLabel(term.term_type)}`}
      >
        View term
      </summary>
      <dl className="mt-2 grid min-w-64 gap-2 rounded-md border bg-card p-3 text-sm shadow-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Academic year</dt>
          <dd className="text-muted-foreground">{term.school_year}</dd>
        </div>
        <div>
          <dt className="font-medium">Semester</dt>
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
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          Edit term
        </Button>
        {closure?.is_closed && (
          <Button type="button" variant="outline" size="sm" onClick={onReopen}>
            Reopen encoding
          </Button>
        )}
      </div>
    </details>
  )
}

function EncodingStatus({ closure }: { closure?: DepartmentTermEncoding }) {
  const isClosed = closure?.is_closed ?? false
  const label = isClosed ? 'Closed' : 'Open'
  const tone = isClosed
    ? 'bg-secondary text-muted-foreground'
    : 'bg-status-pass-bg text-status-pass'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}

export default function AcademicTermsPage() {
  const academicTerms = useAcademicTerms()
  const scope = useStaffScope()
  const [dialogTerm, setDialogTerm] = useState<SchoolTerm | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [closureDialog, setClosureDialog] = useState<{
    mode: EncodingClosureDialogMode
    term: SchoolTerm
  } | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const closures = academicTerms.data?.departmentClosures ?? []
  const closureByTermId = new Map(
    closures.map((closure) => [closure.school_term_id, closure]),
  )
  const terms = academicTerms.data?.terms ?? []
  const closedTerms = terms.filter(
    (term) => closureByTermId.get(term.id)?.is_closed === true,
  ).length
  const openTerms = terms.length - closedTerms

  const columns: Column<SchoolTerm>[] = [
    {
      header: 'Academic year',
      cell: (term) => (
        <span className="font-semibold text-foreground">
          {term.start_year}–{term.end_year}
        </span>
      ),
    },
    {
      header: 'Semester',
      cell: (term) => termTypeLabel(term.term_type).toLowerCase(),
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
      header: 'Status',
      cell: (term) => <EncodingStatus closure={closureByTermId.get(term.id)} />,
    },
    {
      header: 'Actions',
      cell: (term) => {
        const closure = closureByTermId.get(term.id)
        return (
          <div className="flex flex-wrap items-center gap-2">
          {scope.status === 'ready' && !closure?.is_closed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Close encoding for ${term.school_year} ${termTypeLabel(term.term_type)}`}
                onClick={() => {
                  setSaveMessage(null)
                  setClosureDialog({ mode: 'close', term })
                }}
              >
                Close encoding
              </Button>
          ) : (
            <TermDetails
              term={term}
              closure={closure}
              onEdit={() => {
                setDialogTerm(term)
                setSaveMessage(null)
                setDialogOpen(true)
              }}
              onReopen={() => {
                setSaveMessage(null)
                setClosureDialog({ mode: 'reopen', term })
              }}
            />
          )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Academic terms"
        subtitle="Review semester dates and manage the grade encoding period."
        actions={
          <Button
            type="button"
            onClick={() => {
              setDialogTerm(null)
              setSaveMessage(null)
              setDialogOpen(true)
            }}
          >
            <PlusIcon className="size-4" />
            Add a term
          </Button>
        }
      />

      <Alert variant="advisory">
        <AlertIcon />
        <AlertDescription>
          Closing encoding prevents further grade entry for the term. A backup
          reminder is sent to the administrator; the Department Head can record
          a completed backup in Settings.
        </AlertDescription>
      </Alert>

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
        <DataTablePanel
          title="Academic term history"
          description="Encoding windows are tracked separately for each semester."
          columns={columns}
          rows={[...academicTerms.data.terms].sort(
            (left, right) =>
              right.chronological_key - left.chronological_key ||
              left.id.localeCompare(right.id),
          )}
          rowKey={(term) => term.id}
          empty="No academic terms are available."
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status">
                {openTerms} open term{openTerms === 1 ? '' : 's'} · {closedTerms} closed term{closedTerms === 1 ? '' : 's'}
              </p>
              <span>Department scope</span>
            </div>
          }
        />
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
      {closureDialog && (
        <EncodingClosureDialog
          mode={closureDialog.mode}
          term={closureDialog.term}
          onClose={() => setClosureDialog(null)}
          onComplete={(action) => {
            setClosureDialog(null)
            setSaveMessage(
              `Department grade encoding ${action} for ${closureDialog.term.school_year}, ${termTypeLabel(closureDialog.term.term_type)}.`,
            )
          }}
        />
      )}
    </div>
  )
}
