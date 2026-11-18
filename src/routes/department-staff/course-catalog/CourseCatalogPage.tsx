import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Column } from '@/components/features/data-table-panel'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiClientError } from '@/lib/api'
import { courseCatalogMaxOffset, courseCatalogPageSize, type CatalogCourse } from './course-catalog.api'
import { useCourseCatalog, useCourseCatalogReferences } from '@/hooks/use-course-catalog'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { CourseDialog } from './CourseDialog'
import { CourseCatalogActions } from './CourseCatalogActions'
import { CoursePrerequisitesDialog } from './CoursePrerequisitesDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/status-badge'

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

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0
  const page = Number(value)
  const maxPage = Math.floor(courseCatalogMaxOffset / courseCatalogPageSize)
  return Number.isSafeInteger(page) ? Math.min(page, maxPage) : 0
}

function parseStatus(value: string | null): '' | 'active' | 'inactive' {
  return value === 'active' || value === 'inactive' ? value : ''
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
  const [prerequisiteCourse, setPrerequisiteCourse] = useState<CatalogCourse | null>(null)
  const [prerequisiteDialogOpen, setPrerequisiteDialogOpen] = useState(false)
  const prerequisiteTrigger = useRef<HTMLButtonElement | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const staffScope = useStaffScope()
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
    {
      header: 'Course',
      className: 'min-w-0 whitespace-normal',
      cell: course => <div className="min-w-0 space-y-1 break-words">
        <span className="block font-semibold">{displayValue(course.code)}</span>
        <span className="block break-words text-sm text-muted-foreground">{displayValue(course.title)}</span>
      </div>,
    },
    { header: 'Units', className: 'whitespace-nowrap text-center', cell: course => typeof course.units === 'number' && Number.isFinite(course.units) ? course.units : 'Not provided' },
    {
      header: 'Status',
      className: 'whitespace-nowrap',
      cell: course => course.status === 'active'
        ? <StatusBadge status="active">Active</StatusBadge>
        : course.status === 'inactive' || course.status === 'discontinued'
          ? <StatusBadge status="archived">Inactive</StatusBadge>
          : <Badge variant="outline">{statusLabel(course.status)}</Badge>,
    },
    {
      header: 'Actions',
      className: 'min-w-0 whitespace-normal',
      cell: course => {
        const canEdit = staffScope.status === 'ready' && staffScope.departmentIds.includes(course.department_id)
        const department = departmentsById.get(course.department_id)
        const departmentName = department ? `${department.code} · ${department.name}` : course.department_id
        return <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
          {canEdit ? <CourseDialog
            course={course}
            departmentId={course.department_id}
            departmentLabel={departmentName}
            onCreated={() => undefined}
            onUpdated={() => undefined}
            triggerLabel="Edit"
          /> : null}
          <DialogTrigger asChild>
            <Button type="button" size="sm" variant="outline" aria-label={`View prerequisites for ${course.code || 'course'}`} onClick={event => {
              prerequisiteTrigger.current = event.currentTarget
              setPrerequisiteCourse(course)
            }}>
              Prerequisites
            </Button>
          </DialogTrigger>
          {canEdit ? <CourseCatalogActions course={course} departmentLabel={departmentName} showDiscontinue={false} /> : <span className="sr-only">Read only</span>}
        </div>
      },
    },
  ]

  const data = catalog.data
  const start = data?.total ? filters.page * courseCatalogPageSize + 1 : 0
  const end = data ? filters.page * courseCatalogPageSize + data.courses.length : 0
  const hasNext = data?.total != null
    ? end < data.total
    : (data?.courses.length ?? 0) === courseCatalogPageSize
  return (
    <Dialog open={prerequisiteDialogOpen} onOpenChange={setPrerequisiteDialogOpen}>
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading
        title="One catalog. Many academic paths."
        subtitle="Maintain course definitions and prerequisites."
      />

      <Panel
        title="Course catalog"
        description="Different course codes never imply equivalence."
        flush
        bodyClassName="gap-0"
      >
        <div className="department-filter-typography grid gap-4 border-b border-border bg-card px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
          <FormField label="Search records" htmlFor="catalog-search" error={searchError} className="sm:col-span-2 xl:col-span-1">
            <SearchInput id="catalog-search" value={filters.search} placeholder="Search by course code or title" onChange={event => updateFilters({ q: event.target.value })} />
          </FormField>
          <FormField label="Status" htmlFor="catalog-status">
            <Select value={filters.status || 'all'} onValueChange={value => updateFilters({ status: value === 'all' ? '' : value })}>
              <SelectTrigger id="catalog-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All records</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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

        {!searchError && (references.isPending || catalog.isPending) && (
          <p role="status" className="border-t border-border px-5 py-6 text-sm text-muted-foreground">Loading courses and department references…</p>
        )}

        {(references.isError || catalog.isError) && (
          <div className="space-y-4 border-t border-border p-5">
            <p role="alert" className="text-sm text-destructive">{errorMessage(references.error ?? catalog.error)}</p>
            <Button type="button" variant="outline" onClick={() => { void references.refetch(); void catalog.refetch() }} disabled={references.isFetching || catalog.isFetching}>
              {references.isFetching || catalog.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        )}

        {references.isSuccess && catalog.isSuccess && !searchError && (
          <>
            <Table responsive>
              <TableHeader className="bg-secondary">
                <TableRow>
                  {columns.map(column => <TableHead key={column.header} className={`h-auto px-3.5 py-2.5 text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase${column.header === 'Units' ? ' text-center' : ''}`}>{column.header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.courses.map(course => <TableRow key={course.id}>
                  {columns.map(column => <TableCell key={column.header} label={column.header} className={`px-3.5 py-[11px] text-[13.5px] ${column.className ?? ''}`}>
                    {column.cell(course)}
                  </TableCell>)}
                </TableRow>)}
              </TableBody>
            </Table>
            {data.courses.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No courses match these filters.</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
              <p className="text-sm" aria-live="polite">{data.total != null ? `${start}–${end} of ${data.total}` : `Page ${filters.page + 1}`}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => updateFilters({ page: String(filters.page - 1) }, false)} disabled={filters.page === 0 || catalog.isFetching}>Previous</Button>
                <Button type="button" variant="outline" onClick={() => updateFilters({ page: String(filters.page + 1) }, false)} disabled={!hasNext || catalog.isFetching}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Panel>
      <CoursePrerequisitesDialog
        key={prerequisiteCourse?.id ?? 'no-course'}
        course={prerequisiteCourse}
        open={prerequisiteDialogOpen}
        onReturnFocus={() => prerequisiteTrigger.current?.focus()}
      />
    </div>
    </Dialog>
  )
}
