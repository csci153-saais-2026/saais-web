import { useQuery } from "@tanstack/react-query"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { getDeanAuditLogEntries } from "@/routes/dean/api/dean.api"
import { DeanAuditActionPill } from "@/routes/dean/components/DeanAuditActionPill"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import type { DeanAuditAction, DeanAuditEntry, DeanStudentSummary } from "@/routes/dean/types"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function mapCategoryToAction(category: string): DeanAuditAction {
  if (category === "change" || category === "grade_change") return "Change"
  if (category === "auth" || category === "login") return "Sign-in"
  return "View"
}

export function DeanStudentAuditTab({ student }: { student: DeanStudentSummary }) {
  const auditQuery = useQuery({
    queryKey: ["dean", "audit-log"],
    queryFn: getDeanAuditLogEntries,
  })

  if (!auditQuery.data) {
    return (
      <DeanQueryState
        isLoading={auditQuery.isLoading}
        isError={auditQuery.isError}
        label="record audit trail"
        onRetry={() => void auditQuery.refetch()}
      />
    )
  }

  const entries: DeanAuditEntry[] = auditQuery.data
    .filter(
      (entry) =>
        entry.student_id === student.studentId ||
        entry.student_number === student.studentNumber,
    )
    .map((entry) => ({
      id: entry.id,
      timestamp: dateFormatter.format(new Date(entry.created_at)),
      actor: entry.actor_name,
      action: mapCategoryToAction(entry.action_category),
      student: entry.student_name ?? student.name,
      studentId: entry.student_id,
      studentNumber: entry.student_number,
      details: entry.details_summary,
    }))

  return (
    <DataTablePanel
      title="Record audit trail"
      description={`Immutable view and grade change events recorded for ${student.name}.`}
      rows={entries}
      rowKey={(row) => row.id}
      empty="No audit events recorded for this student yet."
      columns={[
        {
          header: "When",
          cell: (row) => (
            <span className="font-mono text-xs text-muted-foreground">
              {row.timestamp}
            </span>
          ),
        },
        {
          header: "Who",
          cell: (row) => <span className="font-medium">{row.actor}</span>,
        },
        {
          header: "Action",
          cell: (row) => <DeanAuditActionPill action={row.action} />,
        },
        {
          header: "Details",
          cell: (row) => row.details,
        },
      ]}
    />
  )
}
