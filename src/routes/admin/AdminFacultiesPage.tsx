import { useEffect, useMemo, useState } from 'react'
import { DataTablePanel } from '@/components/features/data-table-panel'
import { PageHeading } from '@/components/features/page-heading'
import { Button } from '@/components/ui/button'
import {
  apiClient,
  unwrapApiResult,
  type ApiSchema,
  type OperationQuery,
} from '@/lib/api'
import { AdminFacultyDialog } from './AdminFacultyDialog'
import { FACULTY_CATALOG_LIMIT } from './admin-faculties-model'

type Faculty = ApiSchema<'Faculty'>
type Department = ApiSchema<'Department'>

const FACULTY_QUERY: OperationQuery<'listFaculties'> = {
  select: 'id,name,code',
  order: 'name.asc,id.asc',
  limit: FACULTY_CATALOG_LIMIT,
}

const DEPARTMENT_QUERY: OperationQuery<'listDepartments'> = {
  select: 'id,faculty_id,name,code',
  order: 'name.asc,id.asc',
  limit: FACULTY_CATALOG_LIMIT,
}

export default function AdminFacultiesPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loaded, setLoaded] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [facultyDialog, setFacultyDialog] = useState<
    Faculty | null | undefined
  >(undefined)

  useEffect(() => {
    let active = true
    setLoaded(false)
    setError(null)

    void Promise.all([
      apiClient
        .GET('/rest/v1/faculty', { params: { query: FACULTY_QUERY } })
        .then(unwrapApiResult),
      apiClient
        .GET('/rest/v1/department', { params: { query: DEPARTMENT_QUERY } })
        .then(unwrapApiResult),
    ])
      .then(([nextFaculties, nextDepartments]) => {
        if (!active) return
        setFaculties(nextFaculties)
        setDepartments(nextDepartments)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'The faculty and department catalogs could not be loaded.',
        )
      })
      .finally(() => {
        if (active) setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [reloadCount])

  const departmentCounts = useMemo(() => {
    const departmentCounts = new Map<string, number>()
    for (const department of departments) {
      departmentCounts.set(
        department.faculty_id,
        (departmentCounts.get(department.faculty_id) ?? 0) + 1,
      )
    }
    return departmentCounts
  }, [departments])
  const facultiesById = useMemo(
    () => new Map(faculties.map((faculty) => [faculty.id, faculty])),
    [faculties],
  )

  const facultyColumns = [
    {
      header: 'Faculty',
      cell: (faculty: Faculty) => faculty.name,
    },
    {
      header: 'Code',
      className: 'font-mono',
      cell: (faculty: Faculty) => faculty.code || '—',
    },
    {
      header: 'Departments',
      numeric: true,
      cell: (faculty: Faculty) =>
        departmentCounts.get(faculty.id) ?? 0,
    },
    {
      header: 'Actions',
      className: 'whitespace-nowrap',
      cell: (faculty: Faculty) => (
        <Button
          variant="outline"
          size="sm"
          aria-label={`Edit ${faculty.name}`}
          onClick={() => setFacultyDialog(faculty)}
        >
          Edit
        </Button>
      ),
    },
  ]
  const departmentColumns = [
    {
      header: 'Department',
      cell: (department: Department) => department.name,
    },
    {
      header: 'Code',
      className: 'font-mono',
      cell: (department: Department) => department.code || '—',
    },
    {
      header: 'Parent faculty',
      cell: (department: Department) =>
        facultiesById.get(department.faculty_id)?.name ?? 'Unknown faculty',
    },
  ]

  return (
    <div className="mx-auto grid max-w-7xl gap-2 p-4 sm:p-8">
      <PageHeading
        title="Faculties and departments"
        subtitle="Maintain the institutional faculty and department hierarchy."
        actions={<Button onClick={() => setFacultyDialog(null)}>Add faculty</Button>}
      />

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <p className="text-sm">{error}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            Try again
          </Button>
        </div>
      )}

      <DataTablePanel
        title="Faculties"
        description="Institutional colleges and divisions, with department totals."
        columns={facultyColumns}
        rows={loaded && !error ? faculties : []}
        rowKey={(faculty) => faculty.id}
        empty={
          !loaded
            ? 'Loading faculties…'
            : error
              ? 'Faculties are unavailable.'
              : 'No faculties have been added to the catalog.'
        }
      />

      <DataTablePanel
        title="Departments"
        description="Academic departments and their parent faculties."
        columns={departmentColumns}
        rows={loaded && !error ? departments : []}
        rowKey={(department) => department.id}
        empty={
          !loaded
            ? 'Loading departments…'
            : error
              ? 'Departments are unavailable.'
              : 'No departments have been added to the catalog.'
        }
      />

      {facultyDialog !== undefined && (
        <AdminFacultyDialog
          key={facultyDialog?.id ?? 'new'}
          faculty={facultyDialog}
          onOpenChange={(open) => {
            if (!open) setFacultyDialog(undefined)
          }}
          onSubmit={async (request) => {
            if (facultyDialog) {
              await unwrapApiResult(
                await apiClient.PATCH('/functions/v1/catalog/faculty/{id}', {
                  params: { path: { id: facultyDialog.id } },
                  body: request,
                }),
              )
            } else {
              await unwrapApiResult(
                await apiClient.POST('/functions/v1/catalog/faculty', {
                  body: request,
                }),
              )
            }
            setFacultyDialog(undefined)
            setReloadCount((count) => count + 1)
          }}
        />
      )}
    </div>
  )
}
