import { DataTablePanel } from "@/components/features/data-table-panel"
import { DeanAuditActionPill } from "@/routes/dean/components/DeanAuditActionPill"
import type { DeanAuditEntry } from "@/routes/dean/types"

export function DeanStudentAuditTab({
  studentName,
  entries,
}: {
  studentName: string
  entries: DeanAuditEntry[]
}) {
  return (
    <DataTablePanel
      title="Record audit trail"
      description={`Immutable view and grade change events recorded for ${studentName}.`}
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
