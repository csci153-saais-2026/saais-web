import { useMemo, useState } from 'react'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { Button } from '@/components/ui/button'
import { ApiClientError } from '@/lib/api'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import { ReassignAdviserDialog } from './ReassignAdviserDialog'
import { useAdviserAssignmentOptions, useDepartmentAdviserAssignments } from '@/hooks/use-adviser-assignments'
import type { AdviserAssignmentRosterItem } from '@/hooks/use-adviser-assignments'

const STUDENT_PAGE_SIZE = 20
const MAX_SEARCH_LENGTH = 150

const columns: Column<AdviserAssignmentRosterItem>[] = [
  {
    header: 'Student',
    cell: ({ student }) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{student.full_name}</span>
        <span className="text-xs text-muted-foreground">{student.student_number}</span>
      </div>
    ),
  },
  {
    header: 'Current adviser',
    cell: ({ currentAssignment }) =>
      currentAssignment?.adviser_name ?? 'No active assignment',
  },
  {
    header: 'Since',
    cell: ({ currentAssignment }) =>
      currentAssignment?.start_date ?? 'Unavailable',
  },
  {
    header: 'Previous adviser',
    cell: ({ previousAssignment }) =>
      previousAssignment
        ? previousAssignment.adviser_name ?? 'Name unavailable'
        : 'No previous assignment recorded',
  },
  {
    header: 'Curriculum',
    cell: ({ student }) => student.curriculum_label,
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

function getFilterOptionsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isForbidden) {
      return 'Your account is not permitted to load department filter options.'
    }
    if (error.isNetworkError) {
      return 'Could not reach the department filter service. Check your connection and retry.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error prevented the filter options from loading.'
}

export default function AdviserAssignmentsPage() {
  const scope = useStaffScope()
  const [search, setSearch] = useState('')
  const [curriculumVersionId, setCurriculumVersionId] = useState('')
  const [adviserId, setAdviserId] = useState('')
  const [offset, setOffset] = useState(0)
  const [selection, setSelection] = useState<{
    key: string
    studentIds: string[]
  }>({ key: '', studentIds: [] })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      limit: STUDENT_PAGE_SIZE,
      offset,
      ...(search.trim() ? { search: search.trim().slice(0, MAX_SEARCH_LENGTH) } : {}),
      ...(curriculumVersionId ? { curriculum_version_id: curriculumVersionId } : {}),
      ...(adviserId ? { adviser_id: adviserId } : {}),
    }),
    [adviserId, curriculumVersionId, offset, search],
  )
  const selectionKey = JSON.stringify({
    profileId: scope.status === 'ready' ? scope.profileId : '',
    departmentId: scope.status === 'ready' ? scope.departmentId : '',
    filters,
  })
  const selectedIds =
    selection.key === selectionKey ? selection.studentIds : []
  const roster = useDepartmentAdviserAssignments(filters)
  const filterOptions = useAdviserAssignmentOptions()
  const rows = roster.data?.items ?? []
  const selectableRows = rows.filter((item) => item.currentAssignment !== null)
  const selectedStudents = rows.filter((item) =>
    selectedIds.includes(item.student.student_id),
  )
  const hasEligibleSelection =
    selectedStudents.length > 0 &&
    selectedStudents.every((item) => item.currentAssignment !== null)
  const advisers = filterOptions.data?.advisers ?? []

  function updateSelection(nextStudentIds: string[]) {
    setSelection({ key: selectionKey, studentIds: nextStudentIds })
    setSubmissionMessage(null)
  }

  function toggleStudent(studentId: string) {
    const currentIds = selection.key === selectionKey ? selection.studentIds : []
    updateSelection(
      currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId],
    )
  }

  function toggleVisiblePage(checked: boolean) {
    updateSelection(
      checked ? selectableRows.map((item) => item.student.student_id) : [],
    )
  }

  function updateFilter(
    update: () => void,
  ) {
    update()
    setOffset(0)
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Adviser assignments"
        subtitle="Review assignment history and prepare a reassignment preview."
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={
              !hasEligibleSelection ||
              roster.isPending ||
              roster.isFetching ||
              roster.isError ||
              filterOptions.isPending ||
              filterOptions.isError ||
              advisers.length === 0
            }
            onClick={() => setIsDialogOpen(true)}
          >
            Prepare reassignment
          </Button>
        }
      />

      {submissionMessage && (
        <p role="status" className="text-sm text-primary">
          {submissionMessage}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="Search students"
          htmlFor="adviser-roster-search"
          className="md:col-span-1"
        >
          <SearchInput
            id="adviser-roster-search"
            value={search}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Search name or student number"
            onChange={(event) =>
              updateFilter(() => setSearch(event.target.value))
            }
          />
        </FormField>
        <FormField label="Curriculum" htmlFor="adviser-roster-curriculum">
          <select
            id="adviser-roster-curriculum"
            value={curriculumVersionId}
            disabled={filterOptions.isPending || filterOptions.isError}
            onChange={(event) =>
              updateFilter(() => setCurriculumVersionId(event.target.value))
            }
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All curricula</option>
            {(filterOptions.data?.curricula ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Current adviser" htmlFor="adviser-roster-adviser">
          <select
            id="adviser-roster-adviser"
            value={adviserId}
            disabled={filterOptions.isPending || filterOptions.isError}
            onChange={(event) =>
              updateFilter(() => setAdviserId(event.target.value))
            }
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All advisers</option>
            {advisers.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {filterOptions.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading department filters and eligible advisers…
        </p>
      )}
      {filterOptions.isError && (
        <div className="space-y-3" role="alert">
          <p className="text-sm text-destructive">
            {getFilterOptionsErrorMessage(filterOptions.error)}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void filterOptions.refetch()}
            disabled={filterOptions.isFetching}
          >
            {filterOptions.isFetching ? 'Retrying filters…' : 'Retry filters'}
          </Button>
        </div>
      )}
      {filterOptions.isSuccess && advisers.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          No active adviser role is assigned to this department.
        </p>
      )}

      {roster.isPending && (
        <Panel title="Adviser assignments">
          <p role="status" className="p-6 text-sm text-muted-foreground">
            Loading department roster and adviser assignment history…
          </p>
        </Panel>
      )}

      {roster.isError && (
        <Panel title="Adviser assignments">
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-destructive">
              {getRosterErrorMessage(roster.error)}
            </p>
            <Button
              type="button"
              onClick={() => void roster.refetch()}
              disabled={roster.isFetching}
            >
              {roster.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </Panel>
      )}

      {roster.isSuccess && (
        <DataTablePanel
          title="Students in this department"
          description="Current and previous adviser details are taken from the assignment history."
          action={
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={
                  selectableRows.length > 0 &&
                  selectableRows.every((item) =>
                    selectedIds.includes(item.student.student_id),
                  )
                }
                aria-label="Select all students on this page with an active assignment"
                onChange={(event) => toggleVisiblePage(event.target.checked)}
              />
              Select visible
            </label>
          }
          columns={[
            {
              header: 'Select',
              cell: (item) => (
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.student.student_id)}
                  disabled={
                    roster.isFetching ||
                    (!item.currentAssignment &&
                      !selectedIds.includes(item.student.student_id))
                  }
                  aria-label={`Select ${item.student.full_name}`}
                  title={
                    item.currentAssignment
                      ? undefined
                      : 'An active adviser assignment is required for reassignment.'
                  }
                  onChange={() => toggleStudent(item.student.student_id)}
                />
              ),
            },
            ...columns,
          ]}
          rows={[...rows]}
          rowKey={(item) => item.student.student_id}
          empty="No students match these filters."
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status">
                {selectedStudents.length > 0
                  ? `${selectedStudents.length} student${selectedStudents.length === 1 ? '' : 's'} selected on this page.`
                  : roster.data.items.length > 0
                    ? `Showing ${offset + 1}–${offset + roster.data.items.length} of ${roster.data.total_count} matching students`
                    : `No students match these filters. ${roster.data.total_count} total.`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={offset === 0 || roster.isFetching}
                  onClick={() =>
                    setOffset(Math.max(0, offset - STUDENT_PAGE_SIZE))
                  }
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    offset + STUDENT_PAGE_SIZE >= roster.data.total_count ||
                    roster.isFetching
                  }
                  onClick={() => setOffset(offset + STUDENT_PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        />
      )}

      {isDialogOpen && selectedStudents.length > 0 && (
        <ReassignAdviserDialog
          key={selectionKey}
          students={selectedStudents}
          advisers={advisers}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={(response) => {
            setSelection({ key: selectionKey, studentIds: [] })
            setIsDialogOpen(false)
            setSubmissionMessage(
              `Successfully reassigned ${response.reassigned_count} student${response.reassigned_count === 1 ? '' : 's'}.`,
            )
          }}
        />
      )}
    </div>
  )
}
