import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { StatGrid } from '@/components/features/stat-tile'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  apiClient,
  unwrapApiResult,
  type ApiSchema,
  type OperationQuery,
} from '@/lib/api'

const PAGE_SIZE = 20
const ALL = 'all'

type RosterQuery = OperationQuery<'listStudentRoster'>
type Roster = ApiSchema<'StudentRosterResponse'>
type Standing = NonNullable<RosterQuery['standing']>
type SortColumn = NonNullable<RosterQuery['sort_by']>
type BooleanFilter = 'all' | 'true' | 'false'
type FilterOption = { value: string; label: string }

const standingOptions: { value: Standing; label: string }[] = [
  { value: 'good_standing', label: 'Good standing' },
  { value: 'warning', label: 'Warning' },
  { value: 'probation', label: 'Probation' },
  { value: 'dismissed', label: 'Dismissed' },
]

const booleanFilterOptions = [
  { value: 'all', label: 'Any' },
  { value: 'true', label: 'With condition' },
  { value: 'false', label: 'Without condition' },
] as const

function getStandingLabel(standing: Standing): string {
  return standingOptions.find((option) => option.value === standing)?.label ?? standing
}

function getStandingVariant(
  standing: Standing,
): 'default' | 'secondary' | 'destructive' {
  if (standing === 'good_standing') return 'default'
  if (standing === 'dismissed') return 'destructive'
  return 'secondary'
}

function formatGwa(gwa: number | null | undefined): string {
  return gwa == null ? '—' : gwa.toFixed(2)
}

function isStanding(value: string): value is Standing {
  return standingOptions.some((option) => option.value === value)
}

function isBooleanFilter(value: string): value is BooleanFilter {
  return booleanFilterOptions.some((option) => option.value === value)
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  disabled?: boolean
}) {
  return (
    <FormField label={label} htmlFor={id}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full" disabled={disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export default function AdminStudentsPage() {
  const [search, setSearch] = useState('')
  const [facultyId, setFacultyId] = useState(ALL)
  const [programId, setProgramId] = useState(ALL)
  const [yearLevel, setYearLevel] = useState(ALL)
  const [standing, setStanding] = useState<Standing | typeof ALL>(ALL)
  const [hasDeficiencies, setHasDeficiencies] = useState<BooleanFilter>(ALL)
  const [hasOpenInc, setHasOpenInc] = useState<BooleanFilter>(ALL)
  const [hasOpenFlags, setHasOpenFlags] = useState<BooleanFilter>(ALL)
  const [sortBy, setSortBy] = useState<SortColumn>('full_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [roster, setRoster] = useState<Roster | null>(null)
  const [loadedRequestKey, setLoadedRequestKey] = useState('')
  const [requestError, setRequestError] = useState<{
    key: string
    message: string
  } | null>(null)
  const [facultyOptions, setFacultyOptions] = useState<FilterOption[]>([])
  const [programOptions, setProgramOptions] = useState<FilterOption[]>([])
  const [catalogsLoaded, setCatalogsLoaded] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogReload, setCatalogReload] = useState(0)

  const query = useMemo<RosterQuery>(() => {
    const request: RosterQuery = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      sort_by: sortBy,
      sort_dir: sortDir,
    }

    if (search.trim()) request.search = search.trim()
    if (facultyId !== ALL) request.faculty_id = facultyId
    if (programId !== ALL) request.program_id = programId
    if (yearLevel !== ALL) request.year_level = Number(yearLevel)
    if (standing !== ALL) request.standing = standing
    if (hasDeficiencies !== ALL) request.has_deficiencies = hasDeficiencies === 'true'
    if (hasOpenInc !== ALL) request.has_open_inc = hasOpenInc === 'true'
    if (hasOpenFlags !== ALL) request.has_open_flags = hasOpenFlags === 'true'
    return request
  }, [
    page,
    sortBy,
    sortDir,
    search,
    facultyId,
    programId,
    yearLevel,
    standing,
    hasDeficiencies,
    hasOpenInc,
    hasOpenFlags,
  ])
  const requestKey = `${JSON.stringify(query)}:${reload}`
  const loading = loadedRequestKey !== requestKey
  const error = requestError?.key === requestKey ? requestError.message : null

  useEffect(() => {
    let active = true

    void apiClient
      .GET('/functions/v1/students', { params: { query } })
      .then(unwrapApiResult)
      .then((result) => {
        if (!active) return
        setRoster(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setRequestError({
          key: requestKey,
          message:
            requestError instanceof Error
              ? requestError.message
              : 'The student roster could not be loaded.',
        })
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey)
      })

    return () => {
      active = false
    }
  }, [
    query,
    requestKey,
  ])

  useEffect(() => {
    let active = true
    void Promise.all([
      apiClient.GET('/rest/v1/faculty', {
        params: {
          query: { select: 'id,name', order: 'name.asc', limit: 1000 },
        },
      }).then(unwrapApiResult),
      apiClient.GET('/rest/v1/program', {
        params: {
          query: { select: 'id,code,name', order: 'name.asc', limit: 1000 },
        },
      }).then(unwrapApiResult),
    ])
      .then(([faculties, programs]) => {
        if (!active) return
        setFacultyOptions(
          faculties.map((faculty) => ({
            value: faculty.id,
            label: faculty.name,
          })),
        )
        setProgramOptions(
          programs.map((program) => ({
            value: program.id,
            label: `${program.code} · ${program.name}`,
          })),
        )
        setCatalogError(null)
        setCatalogsLoaded(true)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setCatalogError(
          requestError instanceof Error
            ? requestError.message
            : 'Faculty and program filters could not be loaded.',
        )
      })

    return () => {
      active = false
    }
  }, [catalogReload])
  const hasActiveFilters =
    Boolean(search.trim()) ||
    facultyId !== ALL ||
    programId !== ALL ||
    yearLevel !== ALL ||
    standing !== ALL ||
    hasDeficiencies !== ALL ||
    hasOpenInc !== ALL ||
    hasOpenFlags !== ALL
  const totalCount = roster?.total_count ?? 0
  const pageCount = Math.ceil(totalCount / PAGE_SIZE)

  function resetPageAnd<T>(setter: (value: T) => void, value: T) {
    setPage(0)
    setter(value)
  }

  function toggleSort(column: SortColumn) {
    if (sortBy === column) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    setPage(0)
  }

  function sortHeading(label: string, column: SortColumn) {
    const active = sortBy === column
    const marker = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''
    return (
      <button
        type="button"
        className="font-semibold hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Sort by ${label}${active ? `, currently ${sortDir}ending` : ''}`}
        onClick={() => toggleSort(column)}
      >
        {label}
        {marker}
      </button>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-2 p-4 sm:p-8">
      <PageHeading
        title="Student directory"
        subtitle="Search and review the institution-wide student roster and academic overview."
      />

      {catalogError && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <p className="text-sm">{catalogError}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            onClick={() => setCatalogReload((count) => count + 1)}
          >
            Retry filter options
          </Button>
        </div>
      )}

      {roster && (
        <StatGrid
          items={[
            { label: 'Matching students', value: roster.total_count },
            { label: 'With deficiencies', value: roster.with_deficiencies_count },
            { label: 'Open flags', value: roster.flagged_count ?? 0 },
            { label: 'Open INC', value: roster.open_inc_students_count ?? 0 },
          ]}
        />
      )}

      <section
        aria-label="Student roster filters"
        className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <FormField label="Search students" htmlFor="student-search" className="sm:col-span-2">
          <SearchInput
            id="student-search"
            value={search}
            placeholder="Search by name or student number"
            onChange={(event) => resetPageAnd(setSearch, event.target.value)}
          />
        </FormField>
        <FilterSelect
          id="student-faculty"
          label="Faculty / college"
          value={facultyId}
          onChange={(value) => resetPageAnd(setFacultyId, value)}
          options={[{ value: ALL, label: 'All faculties' }, ...facultyOptions]}
          disabled={!catalogsLoaded}
        />
        <FilterSelect
          id="student-program"
          label="Program"
          value={programId}
          onChange={(value) => resetPageAnd(setProgramId, value)}
          options={[{ value: ALL, label: 'All programs' }, ...programOptions]}
          disabled={!catalogsLoaded}
        />
        <FilterSelect
          id="student-year-level"
          label="Year level"
          value={yearLevel}
          onChange={(value) => resetPageAnd(setYearLevel, value)}
          options={[
            { value: ALL, label: 'All year levels' },
            ...[1, 2, 3, 4, 5, 6].map((year) => ({
              value: String(year),
              label: `Year ${year}`,
            })),
          ]}
        />
        <FilterSelect
          id="student-standing"
          label="Academic standing"
          value={standing}
          onChange={(value) => {
            if (value === ALL || isStanding(value)) {
              resetPageAnd(setStanding, value)
            }
          }}
          options={[
            { value: ALL, label: 'All standings' },
            ...standingOptions,
          ]}
        />
        <FilterSelect
          id="student-deficiencies"
          label="Deficiencies"
          value={hasDeficiencies}
          onChange={(value) => {
            if (isBooleanFilter(value)) {
              resetPageAnd(setHasDeficiencies, value)
            }
          }}
          options={[
            { value: ALL, label: 'Any deficiencies' },
            { value: 'true', label: 'Has deficiencies' },
            { value: 'false', label: 'No deficiencies' },
          ]}
        />
        <FilterSelect
          id="student-open-inc"
          label="Open INC"
          value={hasOpenInc}
          onChange={(value) => {
            if (isBooleanFilter(value)) {
              resetPageAnd(setHasOpenInc, value)
            }
          }}
          options={[
            { value: ALL, label: 'Any open INC' },
            { value: 'true', label: 'Has open INC' },
            { value: 'false', label: 'No open INC' },
          ]}
        />
        <FilterSelect
          id="student-open-flags"
          label="Open flags"
          value={hasOpenFlags}
          onChange={(value) => {
            if (isBooleanFilter(value)) {
              resetPageAnd(setHasOpenFlags, value)
            }
          }}
          options={[
            { value: ALL, label: 'Any open flags' },
            { value: 'true', label: 'Has open flags' },
            { value: 'false', label: 'No open flags' },
          ]}
        />
      </section>

      {loading ? (
        <div
          role="status"
          className="rounded-md border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground"
        >
          Loading student roster…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-card px-5 py-6"
        >
          <p className="font-semibold">Unable to load the student roster</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setReload((count) => count + 1)}
          >
            Try again
          </Button>
        </div>
      ) : roster ? (
        <Panel
          title="Students"
          description="Read-only academic roster. Student records are managed through their authorized workflows."
          flush
        >
          <Table responsive className="table-fixed">
            <colgroup>
              <col className="w-[23%]" />
              <col className="w-[14%]" />
              <col className="w-[19%]" />
              <col className="w-[6%]" />
              <col className="w-[7%]" />
              <col className="w-[12%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
            </colgroup>
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  {sortHeading('Student', 'full_name')}
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  {sortHeading('Student number', 'student_number')}
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  Curriculum
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  {sortHeading('Year', 'year_level')}
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-right text-xs leading-tight sm:px-2 sm:text-sm">
                  {sortHeading('GWA', 'gwa')}
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  {sortHeading('Standing', 'standing')}
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  Open flags
                </TableHead>
                <TableHead className="whitespace-normal px-1.5 text-xs leading-tight sm:px-2 sm:text-sm">
                  Deficiencies
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.items.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell label="Student" className="whitespace-normal px-1.5 sm:px-2">
                    <div className="break-words font-semibold leading-tight">
                      {student.full_name}
                    </div>
                    <div className="break-all text-xs leading-tight text-muted-foreground">
                      {student.email}
                    </div>
                  </TableCell>
                  <TableCell
                    label="Student number"
                    className="whitespace-normal break-words px-1.5 font-mono text-xs sm:px-2"
                  >
                    {student.student_number}
                  </TableCell>
                  <TableCell label="Curriculum" className="whitespace-normal px-1.5 sm:px-2">
                    <div className="break-words leading-tight">
                      {student.curriculum_label}
                    </div>
                    <div className="break-words text-xs leading-tight text-muted-foreground">
                      {student.program_code} ·{' '}
                      {student.entry_year ?? 'Entry year unavailable'}
                    </div>
                  </TableCell>
                  <TableCell label="Year" className="whitespace-normal px-1.5 text-center sm:px-2">
                    {student.year_level}
                  </TableCell>
                  <TableCell
                    label="GWA"
                    className="whitespace-normal px-1.5 text-right font-mono sm:px-2"
                  >
                    {formatGwa(student.gwa)}
                  </TableCell>
                  <TableCell label="Standing" className="whitespace-normal px-1.5 sm:px-2">
                    <Badge variant={getStandingVariant(student.standing)}>
                      {getStandingLabel(student.standing)}
                    </Badge>
                  </TableCell>
                  <TableCell label="Open flags" className="whitespace-normal px-1.5 sm:px-2">
                    {student.open_flags_count > 0 ? (
                      <StatusBadge status="flagged">
                        {student.open_flags_count} open
                      </StatusBadge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell
                    label="Deficiencies"
                    className="whitespace-normal px-1.5 sm:px-2"
                  >
                    {student.deficiencies_count > 0 ? (
                      <Badge variant="secondary">
                        {student.deficiencies_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                    {student.open_inc_count > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({student.open_inc_count} INC)
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {roster.items.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'No students match these search criteria.'
                : 'No students are available in the roster.'}
            </p>
          )}
          <div className="flex flex-col gap-3 border-t border-line-soft px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {totalCount === 0
                ? '0 students'
                : `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                    page * PAGE_SIZE + roster.items.length,
                    totalCount,
                  )} of ${totalCount} students`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <span aria-live="polite">
                Page {pageCount === 0 ? 0 : page + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
