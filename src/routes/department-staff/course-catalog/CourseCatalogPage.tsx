import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApiClientError } from '@/lib/api'
import { useCourseCatalog } from '@/hooks/use-course-catalog'
import type { CatalogCourse, CatalogDepartment, CatalogFaculty } from './course-catalog.api'

const courseTypeLabels: Record<string, string> = {
  major: 'Major',
  ge: 'GE',
  elective: 'Elective',
  pe: 'PE',
  nstp: 'NSTP',
  foundation: 'Foundation',
  service: 'Service',
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

export default function CourseCatalogPage() {
  const catalog = useCourseCatalog()
  const departmentsById = new Map((catalog.data?.departments ?? []).map(department => [department.id, department]))
  const facultiesById = new Map((catalog.data?.faculties ?? []).map(faculty => [faculty.id, faculty]))

  const columns: Column<CatalogCourse>[] = [
    {
      header: 'Code',
      className: 'font-mono font-semibold sm:whitespace-nowrap',
      cell: course => displayValue(course.code),
    },
    {
      header: 'Title',
      className: 'min-w-0 whitespace-normal sm:min-w-52',
      cell: course => <span className="block min-w-0 break-words">{displayValue(course.title)}</span>,
    },
    {
      header: 'Department',
      className: 'min-w-0 whitespace-normal sm:min-w-52',
      cell: course => {
        const label = departmentLabel(course, departmentsById, facultiesById)
        return <div className="min-w-0 break-words"><span className="block font-medium">{label.primary}</span><span className="block text-xs text-muted-foreground">{label.secondary}</span></div>
      },
    },
    {
      header: 'Units',
      numeric: true,
      className: 'sm:whitespace-nowrap',
      cell: course => typeof course.units === 'number' && Number.isFinite(course.units) ? course.units : 'Not provided',
    },
    {
      header: 'Type',
      className: 'sm:whitespace-nowrap',
      cell: course => course.category ? courseTypeLabels[course.category] ?? 'Not provided' : 'Not provided',
    },
    {
      header: 'Status',
      className: 'sm:whitespace-nowrap',
      cell: course => <Badge variant={course.status === 'active' ? 'secondary' : 'outline'}>{statusLabel(course.status)}</Badge>,
    },
  ]

  return (
    <div className="-mt-6 space-y-5 md:-mt-(--content-pad-top)">
      <PageHeading title="Course catalog" subtitle="Browse the read-only university course reference." />

      {catalog.isPending && (
        <Panel title="Course catalog">
          <p role="status" className="p-6 text-sm text-muted-foreground">Loading courses and department references…</p>
        </Panel>
      )}

      {catalog.isError && (
        <Panel title="Course catalog">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">{errorMessage(catalog.error)}</p>
            <Button type="button" variant="outline" onClick={() => void catalog.refetch()} disabled={catalog.isFetching}>
              {catalog.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}

      {catalog.isSuccess && (
        <DataTablePanel
          title="Course catalog"
          description="Course and organizational reference information is read-only here."
          columns={columns}
          rows={catalog.data.courses}
          rowKey={course => course.id}
          empty="No courses are available in the catalog."
        />
      )}
    </div>
  )
}
