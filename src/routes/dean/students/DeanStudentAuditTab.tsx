import { DataTablePanel } from "@/components/features/data-table-panel";
import { AuditActionPill } from "@/components/features/audit-action-pill";
import { toDeanAuditAction } from "@/routes/dean/audit-log/use-dean-audit-log";
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState";
import { useDeanStudentAudit } from "@/routes/dean/students/use-dean-students";
import type { DeanAuditEntry, DeanStudentSummary } from "@/routes/dean/types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function DeanStudentAuditTab({
  student,
}: {
  student: DeanStudentSummary;
}) {
  const auditQuery = useDeanStudentAudit(student.studentId);

  if (!auditQuery.data) {
    return (
      <DeanQueryState
        isLoading={auditQuery.isLoading}
        isError={auditQuery.isError}
        label="record audit trail"
        onRetry={() => void auditQuery.refetch()}
      />
    );
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
      action: toDeanAuditAction(entry.action_category),
      student: entry.student_name ?? student.name,
      studentId: entry.student_id,
      studentNumber: entry.student_number,
      details: entry.details_summary,
    }));

  return (
    <DataTablePanel
      title="Record audit trail"
      description={`${entries.length} ${entries.length === 1 ? "record" : "records"}`}
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
          cell: (row) => (
            <span
              className="block max-w-56 truncate font-medium"
              title={row.actor}
            >
              {row.actor}
            </span>
          ),
        },
        {
          header: "Action",
          cell: (row) => <AuditActionPill action={row.action} />,
        },
        {
          header: "Details",
          cell: (row) => (
            <span className="block max-w-96 truncate" title={row.details}>
              {row.details}
            </span>
          ),
        },
      ]}
    />
  );
}
