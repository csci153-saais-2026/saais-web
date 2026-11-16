import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { Button } from '@/components/ui/button'
import { ApiClientError, type ApiSchema } from '@/lib/api'
import {
  useStudentFilterOptions,
  useStudents,
} from './use-students'
import { StudentImportDialog } from './import/StudentImportDialog'
import { useStaffScope } from '../shared/use-staff-scope'

type StudentRosterItem = ApiSchema<'StudentRosterItem'>

const STUDENT_PAGE_SIZE = 20
const MAX_STUDENT_OFFSET = 100_000
const MAX_SEARCH_LENGTH = 150
const UUID_PATTERN =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

const columns: Column<StudentRosterItem>[] = [
  {
    header: 'Student',
    cell: (student) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{student.full_name}</span>
        <span className="text-xs text-muted-foreground">
          {student.student_number}
        </span>
      </div>
    ),
  },
  {
    header: 'Curriculum',
    cell: (student) => student.curriculum_label,
  },
  {
    header: 'Adviser',
    cell: (student) => student.adviser_name ?? 'Unassigned',
  },
]

function getRosterErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to view this department’s student roster.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the student roster service. Check your connection and retry.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'An unexpected error prevented the student roster from loading.'
}

function getFilterOptionsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to load roster filter options.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the roster filter service. Check your connection and retry.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error prevented roster filter options from loading.'
}

function parseOffset(value: string | null): number {
  if (value === null || value.trim() === '') return 0
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0
  return Math.min(
    Math.floor(parsed / STUDENT_PAGE_SIZE) * STUDENT_PAGE_SIZE,
    MAX_STUDENT_OFFSET,
  )
}

function getUuidParam(params: URLSearchParams, key: string): string {
  const value = params.get(key)
  return value && UUID_PATTERN.test(value) ? value : ''
}

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const staffScope = useStaffScope()
  const importScope =
    staffScope.status === 'ready'
      ? {
          profileId: staffScope.profileId,
          departmentId: staffScope.departmentId,
        }
      : null
  const [search, curriculumVersionId, adviserId, offset] = [
    (searchParams.get('search') ?? '').slice(0, MAX_SEARCH_LENGTH),
    getUuidParam(searchParams, 'curriculum_version_id'),
    getUuidParam(searchParams, 'adviser_id'),
    parseOffset(searchParams.get('offset')),
  ]
  const filters = useMemo(
    () => ({
      limit: STUDENT_PAGE_SIZE,
      offset,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(curriculumVersionId
        ? { curriculum_version_id: curriculumVersionId }
        : {}),
      ...(adviserId ? { adviser_id: adviserId } : {}),
    }),
    [adviserId, curriculumVersionId, offset, search],
  )
  const filterOptions = useStudentFilterOptions()
  const {
    data,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useStudents(filters)

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    let changed = false
    const rawSearch = next.get('search')
    if (rawSearch !== null) {
      const boundedSearch = rawSearch.slice(0, MAX_SEARCH_LENGTH)
      if (!boundedSearch.trim()) {
        next.delete('search')
        changed = true
      } else if (boundedSearch !== rawSearch) {
        next.set('search', boundedSearch)
        changed = true
      }
    }

    for (const key of ['curriculum_version_id', 'adviser_id']) {
      const value = next.get(key)
      if (value !== null && !UUID_PATTERN.test(value)) {
        next.delete(key)
        changed = true
      }
    }

    const rawOffset = next.get('offset')
    if (rawOffset !== null) {
      const boundedOffset = parseOffset(rawOffset)
      if (boundedOffset === 0) {
        next.delete('offset')
        changed = true
      } else if (String(boundedOffset) !== rawOffset) {
        next.set('offset', String(boundedOffset))
        changed = true
      }
    }

    if (changed) setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const options = filterOptions.data
    if (!options) return

    const invalidCurriculum =
      curriculumVersionId &&
      !options.curricula.some((option) => option.id === curriculumVersionId)
    const invalidAdviser =
      adviserId &&
      !options.advisers.some((option) => option.id === adviserId)
    if (!invalidCurriculum && !invalidAdviser) return

    const next = new URLSearchParams(searchParams)
    if (invalidCurriculum) next.delete('curriculum_version_id')
    if (invalidAdviser) next.delete('adviser_id')
    next.delete('offset')
    setSearchParams(next, { replace: true })
  }, [
    adviserId,
    curriculumVersionId,
    filterOptions.data,
    searchParams,
    setSearchParams,
  ])

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('offset')
    setSearchParams(next, { replace: true })
  }

  function updateOffset(nextOffset: number) {
    const next = new URLSearchParams(searchParams)
    if (nextOffset <= 0) next.delete('offset')
    else next.set('offset', String(nextOffset))
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Student roster"
        subtitle="Students in your authorized department."
        actions={<StudentImportDialog scope={importScope} />}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Search name or student number"
          htmlFor="student-roster-search"
          className="md:col-span-1"
        >
          <SearchInput
            id="student-roster-search"
            value={search}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Search students"
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </FormField>
        <FormField
          label="Curriculum"
          htmlFor="student-roster-curriculum"
        >
          <select
            id="student-roster-curriculum"
            value={curriculumVersionId}
            disabled={filterOptions.isPending || filterOptions.isError}
            onChange={(event) =>
              updateFilter('curriculum_version_id', event.target.value)
            }
            className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All curricula</option>
            {(filterOptions.data?.curricula ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Adviser" htmlFor="student-roster-adviser">
          <select
            id="student-roster-adviser"
            value={adviserId}
            disabled={filterOptions.isPending || filterOptions.isError}
            onChange={(event) =>
              updateFilter('adviser_id', event.target.value)
            }
            className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All advisers</option>
            {(filterOptions.data?.advisers ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      {filterOptions.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading curriculum and adviser filters…
        </p>
      )}
      {filterOptions.isError && (
        <div className="space-y-3" role="alert">
          <p className="text-sm text-destructive">
            {getFilterOptionsErrorMessage(filterOptions.error)}
          </p>
          <Button
            type="button"
            onClick={() => void filterOptions.refetch()}
            disabled={filterOptions.isFetching}
          >
            {filterOptions.isFetching ? 'Retrying filters…' : 'Retry filters'}
          </Button>
        </div>
      )}
      {isPending && (
        <Panel title="Students">
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Loading student roster…
          </p>
        </Panel>
      )}
      {isError && (
        <Panel title="Students">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              {getRosterErrorMessage(error)}
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}
      {data && !isError && (
        <DataTablePanel
          title="Students"
          description="Roster records returned for your authorized department."
          columns={columns}
          rows={data.items}
          rowKey={(student) => student.student_id}
          empty={
            data.total_count === 0
              ? 'No students match these filters.'
              : 'No students are on this page. Go to a previous page to view results.'
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status">
                {data.items.length > 0
                  ? `Showing ${offset + 1}–${offset + data.items.length} of ${data.total_count} matching students`
                  : `Showing 0 students on this page; ${data.total_count} students match these filters`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={offset === 0 || isFetching}
                  onClick={() =>
                    updateOffset(Math.max(0, offset - STUDENT_PAGE_SIZE))
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    offset + STUDENT_PAGE_SIZE >= data.total_count ||
                    offset >= MAX_STUDENT_OFFSET ||
                    isFetching
                  }
                  onClick={() => updateOffset(offset + STUDENT_PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  )
}
