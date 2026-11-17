import { useSearchParams } from 'react-router'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiClientError } from '@/lib/api'
import { courseCatalogMaxOffset, courseCatalogPageSize, type CatalogCourse, type CatalogDepartment, type CatalogFaculty } from './course-catalog.api'
import { useCourseCatalog, useCourseCatalogReferences } from '@/hooks/use-course-catalog'

const courseTypeLabels: Record<string, string> = {
  major: 'Major', ge: 'GE', elective: 'Elective', pe: 'PE', nstp: 'NSTP', foundation: 'Foundation', service: 'Service',
}

function displayValue(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : 'Not provided'
}

function statusLabel(status: unknown): string {
  if (status === 'active') return 'Active'
  if (status === 'inactive' || status === 'discontinued') return 'Inactive'
  return 'Not provided'
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) return 'Your account is not permitted to read the course catalog or its department references.'
    if (error.isAuthError) return 'Your session could not be verified. Sign in again and retry.'
    if (error.isNetworkError) return 'Could not reach the course catalog. Check your connection and retry.'
  }
  return error instanceof Error ? error.message : 'The course catalog could not be loaded.'
}

function departmentLabel(
  course: CatalogCourse,
  departmentsById: ReadonlyMap<string, CatalogDepartment>,
  facultiesById: ReadonlyMap<string, CatalogFaculty>,
) {
  const department = departmentsById.get(course.department_id)
  if (!department) return { primary: 'Department unavailable', secondary: 'Reference details unavailable' }
  const faculty = department.faculty_id ? facultiesById.get(department.faculty_id) : undefined
  const label = [department.code, department.name].filter(value => typeof value === 'string' && value.trim()).join(' · ')
  return {
    primary: label || 'Department name unavailable',
    secondary: faculty?.name?.trim() || 'Faculty unavailable',
  }
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0
  const page = Number(value)
  const maxPage = Math.floor(courseCatalogMaxOffset / courseCatalogPageSize)
  return Number.isSafeInteger(page) ? Math.min(page, maxPage) : 0
}

function parseStatus(value: string | null): '' | 'active' | 'inactive' | 'discontinued' {
  return value === 'active' || value === 'inactive' || value === 'discontinued' ? value : ''
}

function isValidSearch(value: string): boolean {
  const search = value.trim()
  const hasControlCharacters = Array.from(search).some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
  return search.length <= 100 && !hasControlCharacters && !/[%*_(),."\\]/.test(search)
}

export default function CourseCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = {
    search: searchParams.get('q') ?? '',
    status: parseStatus(searchParams.get('status')),
    facultyId: searchParams.get('faculty') ?? '',
    departmentId: searchParams.get('department') ?? '',
    page: parsePage(searchParams.get('page')),
  }
  const references = useCourseCatalogReferences()
  const searchError = isValidSearch(filters.search)
    ? undefined
    : 'Use 100 characters or fewer. PostgREST syntax, wildcard, and control characters are not supported.'
  const catalog = useCourseCatalog(filters, !searchError)
  const departmentsById = new Map((references.data?.departments ?? []).map(department => [department.id, department]))
  const facultiesById = new Map((references.data?.faculties ?? []).map(faculty => [faculty.id, faculty]))
  const departmentOptions = (references.data?.departments ?? []).filter(
    department => !filters.facultyId || department.faculty_id === filters.facultyId,
  )

  const updateFilters = (updates: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  const columns: Column<CatalogCourse>[] = [
    { header: 'Code', className: 'font-mono font-semibold sm:whitespace-nowrap', cell: course => displayValue(course.code) },
    { header: 'Title', className: 'min-w-0 whitespace-normal sm:min-w-52', cell: course => <span className="block min-w-0 break-words">{displayValue(course.title)}</span> },
    {
      header: 'Department', className: 'min-w-0 whitespace-normal sm:min-w-52',
      cell: course => {
        const label = departmentLabel(course, departmentsById, facultiesById)
        return <div className="min-w-0 break-words"><span className="block font-medium">{label.primary}</span><span className="block text-xs text-muted-foreground">{label.secondary}</span></div>
      },
    },
    { header: 'Units', numeric: true, className: 'sm:whitespace-nowrap', cell: course => typeof course.units === 'number' && Number.isFinite(course.units) ? course.units : 'Not provided' },
    { header: 'Type', className: 'sm:whitespace-nowrap', cell: course => course.category ? courseTypeLabels[course.category] ?? 'Not provided' : 'Not provided' },
    { header: 'Status', className: 'sm:whitespace-nowrap', cell: course => <Badge variant={course.status === 'active' ? 'secondary' : 'outline'}>{statusLabel(course.status)}</Badge> },
  ]

  const data = catalog.data
  const start = data?.total ? filters.page * courseCatalogPageSize + 1 : 0
  const end = data ? filters.page * courseCatalogPageSize + data.courses.length : 0
  const hasNext = data?.total != null
    ? end < data.total
    : (data?.courses.length ?? 0) === courseCatalogPageSize
  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading title="Course catalog" subtitle="Browse the read-only university course reference." />

      <Panel title="Course catalog" description="Course and organizational reference information is read-only here.">
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <FormField label="Search courses" htmlFor="catalog-search" error={searchError} className="sm:col-span-2 xl:col-span-1">
            <SearchInput id="catalog-search" value={filters.search} placeholder="Search by code or title" onChange={event => updateFilters({ q: event.target.value })} />
          </FormField>
          <FormField label="Status" htmlFor="catalog-status">
            <Select value={filters.status || 'all'} onValueChange={value => updateFilters({ status: value === 'all' ? '' : value })}>
              <SelectTrigger id="catalog-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued (shown as Inactive)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Faculty" htmlFor="catalog-faculty">
            <Select value={filters.facultyId || 'all'} onValueChange={value => updateFilters({ faculty: value === 'all' ? '' : value, department: '' })}>
              <SelectTrigger id="catalog-faculty" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All faculties</SelectItem>
                {(references.data?.faculties ?? []).map(faculty => <SelectItem key={faculty.id} value={faculty.id}>{faculty.code} · {faculty.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Department" htmlFor="catalog-department">
            <Select value={filters.departmentId || 'all'} onValueChange={value => updateFilters({ department: value === 'all' ? '' : value })}>
              <SelectTrigger id="catalog-department" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map(department => <SelectItem key={department.id} value={department.id}>{department.code} · {department.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </Panel>

      {!searchError && (references.isPending || catalog.isPending) && (
        <Panel title="Catalog results">
          <p role="status" className="p-6 text-sm text-muted-foreground">Loading courses and department references…</p>
        </Panel>
      )}

      {(references.isError || catalog.isError) && (
        <Panel title="Catalog results">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">{errorMessage(references.error ?? catalog.error)}</p>
            <Button type="button" variant="outline" onClick={() => { void references.refetch(); void catalog.refetch() }} disabled={references.isFetching || catalog.isFetching}>
              {references.isFetching || catalog.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}

      {references.isSuccess && catalog.isSuccess && !searchError && (
        <DataTablePanel
          title="Catalog results"
          description={data?.total == null
            ? `${data?.courses.length ?? 0} courses on this page`
            : `Showing ${start}–${end} of ${data.total} courses`}
          columns={columns}
          rows={data.courses}
          rowKey={course => course.id}
          empty="No courses match these filters."
          footer={(
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">{data?.total != null ? `${start}–${end} of ${data.total}` : `Page ${filters.page + 1}`}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => updateFilters({ page: String(filters.page - 1) }, false)} disabled={filters.page === 0 || catalog.isFetching}>Previous</Button>
                <Button type="button" variant="outline" onClick={() => updateFilters({ page: String(filters.page + 1) }, false)} disabled={!hasNext || catalog.isFetching}>Next</Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  )
}
