import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { DataTablePanel } from '@/components/features/data-table-panel'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { SearchInput } from '@/components/features/search-input'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  apiClient,
  parseContentRange,
  unwrapApiResult,
} from '@/lib/api'
import {
  AUDIT_ACTION_CATEGORIES,
  AUDIT_PAGE_SIZE,
  buildAuditListQuery,
  type AuditFilters,
  type AuditLogRow,
} from './admin-audit-model'
import type { Column } from '@/components/features/data-table-panel'

const EMPTY_FILTERS: AuditFilters = {
  person: '',
  student: '',
  action: '',
  category: '',
  entityType: '',
  from: '',
  to: '',
}

function humanize(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ')
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

export default function AdminAuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] =
    useState<AuditFilters>(EMPTY_FILTERS)
  const [offset, setOffset] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  const [entries, setEntries] = useState<AuditLogRow[]>([])
  const [rangeTotal, setRangeTotal] = useState<number | null>(null)
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const [requestError, setRequestError] = useState<{
    readonly key: string
    readonly message: string
  } | null>(null)

  const { query, error: filterError } = useMemo(
    () => buildAuditListQuery(appliedFilters, offset),
    [appliedFilters, offset],
  )
  const requestKey = query ? `${JSON.stringify(query)}:${reloadCount}` : ''
  const loading = Boolean(query) && loadedRequestKey !== requestKey
  const error = requestError?.key === requestKey ? requestError.message : null
  const hasNextPage =
    rangeTotal !== null
      ? offset + AUDIT_PAGE_SIZE < rangeTotal
      : entries.length === AUDIT_PAGE_SIZE

  useEffect(() => {
    if (!query) return

    let active = true
    void apiClient
      .GET('/rest/v1/audit_log_entry', { params: { query } })
      .then((result) => {
        const nextEntries = unwrapApiResult(result)
        if (!active) return
        setEntries(nextEntries)
        setRangeTotal(
          parseContentRange(result.response.headers.get('Content-Range'))
            ?.total ?? null,
        )
        setRequestError(null)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setRequestError({
          key: requestKey,
          message:
            requestError instanceof Error
              ? requestError.message
              : 'Audit history could not be loaded.',
        })
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey)
      })

    return () => {
      active = false
    }
  }, [query, requestKey])

  const retry = useCallback(() => {
    setReloadCount((count) => count + 1)
  }, [])

  function updateFilter<K extends keyof AuditFilters>(
    key: K,
    value: AuditFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOffset(0)
    setAppliedFilters({ ...filters })
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setOffset(0)
  }

  const columns: Column<AuditLogRow>[] = [
    {
      header: 'Timestamp',
      className: 'whitespace-nowrap',
      cell: (entry) => (
        <time dateTime={entry.created_at}>
          {formatTimestamp(entry.created_at)}
        </time>
      ),
    },
    {
      header: 'Person',
      cell: (entry) => (
        <div>
          <p className="font-medium">{entry.actor_name || 'System'}</p>
          {entry.actor_role && (
            <p className="text-xs text-muted-foreground">
              {humanize(entry.actor_role)}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Action',
      cell: (entry) => (
        <div className="grid justify-items-start gap-1">
          {entry.action_category && (
            <Badge variant="secondary">
              {AUDIT_ACTION_CATEGORIES.find(
                (category) => category.value === entry.action_category,
              )?.label ?? humanize(entry.action_category)}
            </Badge>
          )}
          <span>{humanize(entry.action)}</span>
        </div>
      ),
    },
    {
      header: 'Student / record',
      cell: (entry) => (
        <div>
          {entry.student_name && (
            <p className="font-medium">{entry.student_name}</p>
          )}
          {entry.student_number && (
            <p className="font-mono text-xs">{entry.student_number}</p>
          )}
          {!entry.student_name && !entry.student_number && (
            <p>{entry.target_label || humanize(entry.entity_type)}</p>
          )}
          {entry.student_name && entry.target_label && (
            <p className="text-xs text-muted-foreground">
              {entry.target_label}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Details',
      cell: (entry) => entry.details_summary || 'No details provided.',
    },
  ]

  const visibleEntries =
    loading || error || filterError ? [] : entries
  const pageNumber = Math.floor(offset / AUDIT_PAGE_SIZE) + 1

  return (
    <div className="grid gap-2">
      <PageHeading
        title="Audit log"
        subtitle="Review institution-wide, immutable system activity."
        className="mb-4"
      />

      <Panel
        title="Activity filters"
        description="Narrow the audit history by person, student, action, record type, or date."
      >
        <form onSubmit={applyFilters} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Person" htmlFor="audit-person">
              <SearchInput
                id="audit-person"
                value={filters.person}
                maxLength={100}
                placeholder="Search by person"
                onChange={(event) => updateFilter('person', event.target.value)}
              />
            </FormField>
            <FormField label="Student name or number" htmlFor="audit-student">
              <SearchInput
                id="audit-student"
                value={filters.student}
                maxLength={100}
                placeholder="Search by student"
                onChange={(event) => updateFilter('student', event.target.value)}
              />
            </FormField>
            <FormField label="Action" htmlFor="audit-action">
              <SearchInput
                id="audit-action"
                value={filters.action}
                maxLength={100}
                placeholder="Search action"
                onChange={(event) => updateFilter('action', event.target.value)}
              />
            </FormField>
            <FormField label="Action category" htmlFor="audit-category">
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) =>
                  updateFilter('category', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger id="audit-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All action categories</SelectItem>
                  {AUDIT_ACTION_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Record type" htmlFor="audit-entity-type">
              <Input
                id="audit-entity-type"
                value={filters.entityType}
                maxLength={100}
                placeholder="e.g. advising_plan"
                onChange={(event) =>
                  updateFilter('entityType', event.target.value)
                }
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="From" htmlFor="audit-date-from">
                <Input
                  id="audit-date-from"
                  type="date"
                  value={filters.from}
                  onChange={(event) => updateFilter('from', event.target.value)}
                />
              </FormField>
              <FormField label="To" htmlFor="audit-date-to">
                <Input
                  id="audit-date-to"
                  type="date"
                  value={filters.to}
                  onChange={(event) => updateFilter('to', event.target.value)}
                />
              </FormField>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </form>
      </Panel>

      {filterError && (
        <p role="alert" className="text-sm text-destructive">
          {filterError}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <p className="text-sm">{error}</p>
          <Button className="mt-2" variant="outline" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading audit history…
        </p>
      )}

      <DataTablePanel
        title="System activity"
        description="Immutable account, catalog, record, and sign-in history."
        columns={columns}
        rows={visibleEntries}
        rowKey={(entry) => entry.id}
        empty={
          loading
            ? 'Loading audit history…'
            : filterError
              ? 'Correct the filters to view audit history.'
              : error
                ? 'Audit history is unavailable.'
                : entries.length === 0
                  ? 'No audit entries match the selected filters.'
                  : 'No audit entries are available on this page.'
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {rangeTotal === null
                ? `Page ${pageNumber}`
                : `Page ${pageNumber} · ${rangeTotal.toLocaleString()} entries`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading || Boolean(error)}
                onClick={() =>
                  setOffset((current) =>
                    Math.max(0, current - AUDIT_PAGE_SIZE),
                  )
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || loading || Boolean(error)}
                onClick={() =>
                  setOffset((current) => current + AUDIT_PAGE_SIZE)
                }
              >
                Next
              </Button>
            </div>
          </div>
        }
      />
    </div>
  )
}
