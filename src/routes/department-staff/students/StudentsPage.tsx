import { PageHeading } from '@/components/features/page-heading'
import { DataTablePanel, type Column } from '@/components/features/data-table-panel'
import { Panel } from '@/components/features/panel'
import { Button } from '@/components/ui/button'
import { ApiClientError, type ApiSchema } from '@/lib/api'
import { useStudents } from './use-students'

type StudentRosterItem = ApiSchema<'StudentRosterItem'>

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

export default function StudentsPage() {
  const {
    data,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useStudents()

  return (
    <div className="space-y-6">
      <PageHeading
        title="Student roster"
        subtitle="Students in your authorized department."
      />
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
          empty="No students were returned for this department."
        />
      )}
    </div>
  )
}
