import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import type { Column } from '@/components/features/data-table-panel'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiClientError, type ApiSchema } from '@/lib/api'
import {
  useStudentFilterOptions,
  useStudents,
} from './use-students'
import { useAcademicTerms } from '@/hooks/use-academic-terms'
import { useStaffDepartmentName } from '@/hooks/use-staff-department-name'
import { StudentImportDialog } from './import/StudentImportDialog'
import { useStaffScope } from '../shared/use-staff-scope'

type StudentRosterItem = ApiSchema<'StudentRosterItem'>

const STUDENT_PAGE_SIZE = 20
const MAX_STUDENT_OFFSET = 100_000
const MAX_SEARCH_LENGTH = 150
const DIRECTORY_PANEL_TYPOGRAPHY =
  '[&_[data-slot=card-title]]:font-sans [&_[data-slot=card-title]]:text-heading [&_[data-slot=card-title]]:font-semibold [&_[data-slot=card-description]]:font-sans [&_[data-slot=card-description]]:text-[13px] [&_[data-slot=card-description]]:leading-[1.5] [&_[data-slot=card-description]]:text-muted-2'
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
    header: 'School email',
    cell: (student) => student.email || '—',
  },
  {
    header: 'Curriculum',
    cell: (student) => student.curriculum_label,
  },
  {
    header: 'Year standing',
    cell: (student) => formatYearStanding(student.year_level),
  },
  {
    header: 'Adviser',
    cell: (student) => student.adviser_name ?? 'Unassigned',
  },
]

function formatYearStanding(yearLevel: number): string {
  const suffix =
    yearLevel % 100 >= 11 && yearLevel % 100 <= 13
      ? 'th'
      : yearLevel % 10 === 1
        ? 'st'
        : yearLevel % 10 === 2
          ? 'nd'
          : yearLevel % 10 === 3
            ? 'rd'
            : 'th'
  return `${yearLevel}${suffix} year`
}

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

function joinLabels(labels: readonly string[]): string {
  if (labels.length < 2) return labels[0] ?? ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`
}

function getCurrentAcademicTerm(
  terms: readonly ApiSchema<'SchoolTerm'>[],
): ApiSchema<'SchoolTerm'> | undefined {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila',
  })
  return terms.find(
    (term) =>
      Boolean(term.starts_on) &&
      term.starts_on! <= today &&
      term.ends_on >= today,
  )
}

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const staffScope = useStaffScope()
  const departmentName = useStaffDepartmentName()
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
  const academicTerms = useAcademicTerms()
  const enrollmentCount = useStudents({ limit: 1, offset: 0 })
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

  function resetFilters() {
    const next = new URLSearchParams(searchParams)
    for (const key of [
      'search',
      'curriculum_version_id',
      'adviser_id',
      'offset',
    ]) {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  const resultNoun = data?.total_count === 1 ? 'student' : 'students'
  const resultVerb = data?.total_count === 1 ? 'matches' : 'match'
  const programCodes = [...new Set(
    (filterOptions.data?.curricula ?? [])
      .map((option) => option.label.split(' — ')[0]?.trim())
      .filter((code): code is string => Boolean(code)),
  )]
  const currentTerm = academicTerms.data
    ? getCurrentAcademicTerm(academicTerms.data.terms)
    : undefined
  const directoryDescription = [
    enrollmentCount.data
      ? `${enrollmentCount.data.total_count} enrolled ${enrollmentCount.data.total_count === 1 ? 'student' : 'students'}`
      : 'Enrollment count unavailable',
    programCodes.length > 0
      ? joinLabels(programCodes)
      : filterOptions.isPending
        ? 'Loading courses'
        : 'Courses unavailable',
    currentTerm
      ? `AY ${currentTerm.school_year}, ${currentTerm.term_type}`
      : academicTerms.isPending
        ? 'Loading academic year and term'
        : 'Academic year and term unavailable',
  ].join(' · ')

  const filterControls = (
    <div className="department-filter-typography space-y-3">
      <div className="grid items-end gap-4 md:grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_auto]">
        <FormField label="Search students" htmlFor="student-roster-search">
          <SearchInput
            id="student-roster-search"
            value={search}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Search by student name or ID"
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </FormField>
        <FormField label="Curriculum" htmlFor="student-roster-curriculum">
          <Select
            value={curriculumVersionId || 'all'}
            disabled={filterOptions.isPending || filterOptions.isError}
            onValueChange={(value) =>
              updateFilter(
                'curriculum_version_id',
                value === 'all' ? '' : value,
              )
            }
          >
            <SelectTrigger id="student-roster-curriculum" className="w-full">
              <SelectValue placeholder="All curricula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All curricula</SelectItem>
              {(filterOptions.data?.curricula ?? []).map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Adviser" htmlFor="student-roster-adviser">
          <Select
            value={adviserId || 'all'}
            disabled={filterOptions.isPending || filterOptions.isError}
            onValueChange={(value) =>
              updateFilter('adviser_id', value === 'all' ? '' : value)
            }
          >
            <SelectTrigger id="student-roster-adviser" className="w-full">
              <SelectValue placeholder="All advisers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All advisers</SelectItem>
              {(filterOptions.data?.advisers ?? []).map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <Button
          type="button"
          variant="link"
          className="justify-self-start px-1 md:justify-self-end"
          onClick={resetFilters}
          disabled={!search && !curriculumVersionId && !adviserId && offset === 0}
        >
          Reset filters
        </Button>
      </div>
      {filterOptions.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading curriculum and adviser filters…
        </p>
      )}
      {filterOptions.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
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
    </div>
  )

  return (
    <div className="-mt-6 space-y-6 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Students"
        subtitle={`Find and maintain student records within the ${departmentName.data ?? 'your department'}.`}
        actions={<StudentImportDialog scope={importScope} />}
      />
      {isPending && (
        <Panel
          title="Department directory"
          description={directoryDescription}
          className={DIRECTORY_PANEL_TYPOGRAPHY}
          flush
          bodyClassName="gap-0"
        >
          <div className="space-y-4 border-b border-border p-5">
            {filterControls}
          </div>
          <p role="status" className="p-5 text-sm text-muted-foreground">
            Loading student roster…
          </p>
        </Panel>
      )}
      {isError && (
        <Panel
          title="Department directory"
          description={directoryDescription}
          className={DIRECTORY_PANEL_TYPOGRAPHY}
          flush
          bodyClassName="gap-0"
        >
          <div className="space-y-4 border-b border-border p-5">
            {filterControls}
          </div>
          <div className="space-y-4 p-5">
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
        <Panel
          title="Department directory"
          description={directoryDescription}
          className={DIRECTORY_PANEL_TYPOGRAPHY}
          flush
          bodyClassName="gap-0"
        >
          <div className="space-y-4 border-b border-border p-5">
            {filterControls}
          </div>
          <Table responsive>
            <TableHeader className="bg-secondary">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.header}
                    className="text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase"
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((student) => (
                <TableRow key={student.student_id}>
                  {columns.map((column) => (
                    <TableCell key={column.header} label={column.header} className="py-2.5 text-[13.5px]">
                      {column.cell(student)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.items.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {data.total_count === 0
                ? 'No students match these filters.'
                : 'No students are on this page. Go to a previous page to view results.'}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
            <p role="status">
              {data.items.length > 0
                ? `Showing ${offset + 1}–${offset + data.items.length} of ${data.total_count} ${resultNoun}`
                : `No students shown; ${data.total_count} ${resultNoun} ${resultVerb} these filters`}
            </p>
            <span>Department-scoped records</span>
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
        </Panel>
      )}
    </div>
  )
}
