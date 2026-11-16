import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeading } from '@/components/features/page-heading'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { ApiClientError } from '@/lib/api'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { staffQueryKeys } from '@/routes/department-staff/shared/staff-query-keys'
import { ReassignAdviserDialog } from './ReassignAdviserDialog'
import {
  useAdviserAssignmentOptions,
  useDepartmentAdviserAssignments,
} from '@/hooks/use-adviser-assignments'
import type { ApiSchema } from '@/lib/api'

type StudentRow = ApiSchema<'StudentRosterItem'>

const columns: Column<StudentRow>[] = [
  {
    header: 'Student',
    cell: (student) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{student.full_name}</span>
        <span className="text-xs text-muted-foreground">{student.student_number}</span>
      </div>
    ),
  },
  {
    header: 'Current adviser',
    cell: (student) => student.adviser_name ?? 'Unassigned',
  },
  {
    header: 'Curriculum',
    cell: (student) => student.curriculum_label,
  },
  {
    header: 'Assignment',
    cell: (student) => student.adviser_id ? 'Active' : 'No adviser',
  },
]

function getRosterErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to review this department’s adviser assignments.'
    }
    if (error.isAuthError) {
      return 'Your session could not be verified. Sign in again and retry.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the adviser assignment service. Check your connection and retry.'
    }
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'An unexpected error prevented the adviser assignment list from loading.'
}

export default function AdviserAssignmentsPage() {
  const scope = useStaffScope()
  const queryClient = useQueryClient()
  const roster = useDepartmentAdviserAssignments()
  const filterOptions = useAdviserAssignmentOptions()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const rows = useMemo(() => roster.data ?? [], [roster.data])

  const activeAdviserOptions = useMemo(
    () =>
      (filterOptions.data?.advisers ?? []).map((option) => ({
        id: option.id,
        label: option.label,
      })),
    [filterOptions.data?.advisers],
  )

  const selectedStudents = rows.filter((row) => selectedIds.includes(row.student_id))

  function toggleStudent(studentId: string) {
    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    )
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(rows.map((row) => row.student_id))
      return
    }
    setSelectedIds([])
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Adviser assignments"
        subtitle="Reassign eligible students within your authorized department."
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={selectedStudents.length === 0 || roster.isPending || roster.isError}
            onClick={() => setIsDialogOpen(true)}
          >
            Reassign selected
          </Button>
        }
      />

      {selectedStudents.length > 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'} selected.
        </p>
      )}

      {filterOptions.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading adviser options…
        </p>
      )}

      {roster.isPending && (
        <Panel title="Adviser assignments">
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Loading current adviser assignments…
          </p>
        </Panel>
      )}

      {roster.isError && (
        <Panel title="Adviser assignments">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              {getRosterErrorMessage(roster.error)}
            </p>
            <Button type="button" onClick={() => void roster.refetch()} disabled={roster.isFetching}>
              {roster.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}

      {roster.isSuccess && (
        <DataTablePanel
          title="Students in this department"
          description="Current adviser assignments and the students ready for reassignment."
          action={
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rows.length > 0 && selectedIds.length === rows.length}
                aria-label="Select all students"
                onChange={(event) => toggleAll(event.target.checked)}
              />
              Select all
            </label>
          }
          columns={[
            {
              header: 'Select',
              cell: (student) => (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.student_id)}
                  aria-label={`Select ${student.full_name}`}
                  onChange={() => toggleStudent(student.student_id)}
                />
              ),
            },
            ...columns,
          ]}
          rows={rows}
          rowKey={(student) => student.student_id}
          empty="No students are currently assigned in this department."
        />
      )}

      <ReassignAdviserDialog
        students={selectedStudents}
        advisers={activeAdviserOptions}
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setSelectedIds([])
          setIsDialogOpen(false)
          if (scope.status === 'ready') {
            void queryClient.invalidateQueries({
              queryKey: staffQueryKeys.resource(scope.profileId, scope.departmentId, 'students', {
                limit: 1000,
                offset: 0,
              }),
            })
            void queryClient.invalidateQueries({
              queryKey: staffQueryKeys.resource(scope.profileId, scope.departmentId, 'adviser-assignments'),
            })
          }
        }}
      />
    </div>
  )
}
