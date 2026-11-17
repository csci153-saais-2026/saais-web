import { useMemo, useState } from 'react'
import { FormField } from '@/components/features/form-field'
import { PageHeading } from '@/components/features/page-heading'
import { useStaffDepartmentName } from '@/hooks/use-staff-department-name'
import { Panel } from '@/components/features/panel'
import { SearchInput } from '@/components/features/search-input'
import { FlagIcon, SwapIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiClientError } from '@/lib/api'
import { useStaffScope } from '@/routes/department-staff/shared/use-staff-scope'
import {
  useAdviserAssignmentOptions,
  useDepartmentAdviserAssignments,
  type AdviserAssignmentRosterItem,
} from '@/hooks/use-adviser-assignments'
import { ReassignAdviserDialog } from './ReassignAdviserDialog'

const STUDENT_PAGE_SIZE = 20
const MAX_SEARCH_LENGTH = 150

function shortCurriculumLabel(item: AdviserAssignmentRosterItem): string {
  const year = item.student.curriculum_label.match(/\b\d{4}\b/)?.[0]
  return year
    ? `${item.student.program_code} ${year}`
    : item.student.curriculum_label
}

function formatAssignmentDate(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

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
  const departmentName = useStaffDepartmentName()
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
  const selectedIds = selection.key === selectionKey ? selection.studentIds : []
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
  const canPrepareReassignment =
    hasEligibleSelection &&
    !roster.isPending &&
    !roster.isFetching &&
    !roster.isError &&
    !filterOptions.isPending &&
    !filterOptions.isError &&
    advisers.length > 0

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

  function updateFilter(update: () => void) {
    update()
    setOffset(0)
  }

  return (
    <div className="-mt-6 space-y-6 md:-mt-(--content-pad-top)">
      <PageHeading
        title="Adviser assignments"
        subtitle={`Assign and reassign advisers to students in the ${departmentName.data ?? 'your department'}.`}
      />

      {submissionMessage && (
        <p role="status" className="text-sm text-primary">
          {submissionMessage}
        </p>
      )}

      <div className="flex items-start gap-3 rounded-sm border border-[#ebdcae] bg-[#fcf4e0] px-4 py-3 text-[13.5px] leading-[1.5] text-[#7a5406]">
        <FlagIcon className="mt-0.5 size-[18px] shrink-0" />
        <p>
          Reassignment takes effect on the selected date. The previous adviser
          and assignment history remain visible.
        </p>
      </div>

      <Panel
        title="Student–adviser assignments"
        description="Select one or more students to reassign together."
        flush
        bodyClassName="gap-0"
      >
        <div className="department-filter-typography grid gap-3 border-b border-line-soft px-5 py-4 md:grid-cols-[minmax(14rem,1.4fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
          <FormField label="Search students" htmlFor="adviser-roster-search">
            <SearchInput
              id="adviser-roster-search"
              value={search}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Search by student name or ID"
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
              className="min-h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
            >
              <option value="">All curricula</option>
              {(filterOptions.data?.curricula ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Adviser" htmlFor="adviser-roster-adviser">
            <select
              id="adviser-roster-adviser"
              value={adviserId}
              disabled={filterOptions.isPending || filterOptions.isError}
              onChange={(event) =>
                updateFilter(() => setAdviserId(event.target.value))
              }
              className="min-h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
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

        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line-soft px-5 py-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selectedStudents.length} student{selectedStudents.length === 1 ? '' : 's'} selected
          </p>
          <Button
            type="button"
            disabled={!canPrepareReassignment}
            onClick={() => setIsDialogOpen(true)}
          >
            <SwapIcon className="size-4" />
            Reassign selected
          </Button>
        </div>

        {filterOptions.isPending && (
          <p role="status" className="px-5 py-3 text-sm text-muted-foreground">
            Loading department filters and eligible advisers…
          </p>
        )}
        {filterOptions.isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" role="alert">
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
          <p role="status" className="px-5 py-3 text-sm text-muted-foreground">
            No active adviser role is assigned to this department.
          </p>
        )}

        {roster.isPending && (
          <p role="status" className="px-5 py-8 text-sm text-muted-foreground">
            Loading department roster and adviser assignment history…
          </p>
        )}
        {roster.isError && (
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <p role="alert" className="text-sm text-destructive">
              {getRosterErrorMessage(roster.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void roster.refetch()}
              disabled={roster.isFetching}
            >
              {roster.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        )}

        {roster.isSuccess && (
          <>
              <Table responsive className="text-left text-[13.5px]">
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="w-12 px-3">
                      <input
                        type="checkbox"
                        checked={
                          selectableRows.length > 0 &&
                          selectableRows.every((item) =>
                            selectedIds.includes(item.student.student_id),
                          )
                        }
                        aria-label="Select all visible students"
                        onChange={(event) => toggleVisiblePage(event.target.checked)}
                      />
                    </TableHead>
                    {['Student', 'Current adviser', 'Since', 'Previous adviser'].map((header) => (
                      <TableHead key={header} className="px-3 text-[11.5px] font-semibold tracking-[0.09em] text-muted-2 uppercase">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.student.student_id}>
                      <TableCell label="Select" className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.student.student_id)}
                          disabled={
                            roster.isFetching ||
                            (!item.currentAssignment &&
                              !selectedIds.includes(item.student.student_id))
                          }
                          aria-label={`Select ${item.student.full_name}`}
                          title={item.currentAssignment ? undefined : 'An active adviser assignment is required for reassignment.'}
                          onChange={() => toggleStudent(item.student.student_id)}
                        />
                      </TableCell>
                      <TableCell label="Student" className="px-3 py-3">
                        <div className="flex min-w-0 flex-col items-start gap-0.5">
                          <span className="font-medium text-foreground">{item.student.full_name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{item.student.student_number}</span>
                          <span className="mt-1 inline-flex items-center rounded-sm bg-[#ece8da] px-2 py-0.5 text-xs font-semibold text-[#5c5a4c]">
                            {shortCurriculumLabel(item)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell label="Current adviser" className="px-3 py-3">
                        {item.currentAssignment?.adviser_name ?? '—'}
                      </TableCell>
                      <TableCell label="Since" className="px-3 py-3">
                        {formatAssignmentDate(item.currentAssignment?.start_date)}
                      </TableCell>
                      <TableCell label="Previous adviser" className="px-3 py-3">
                        {item.previousAssignment?.adviser_name ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            {rows.length === 0 && (
              <p className="px-5 py-7 text-center text-sm text-muted-foreground">
                No students match these filters.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-xs text-muted-foreground">
              <p role="status">
                {rows.length > 0
                  ? `Showing ${offset + 1}–${offset + rows.length} of ${roster.data.total_count} students`
                  : `No students shown; ${roster.data.total_count} students match these filters`}
                {' · '}Department scope
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || roster.isFetching}
                  onClick={() => setOffset(Math.max(0, offset - STUDENT_PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset + STUDENT_PAGE_SIZE >= roster.data.total_count || roster.isFetching}
                  onClick={() => setOffset(offset + STUDENT_PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>

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
