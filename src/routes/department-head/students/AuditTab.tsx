import { AuditActionPill } from "@/components/features/audit-action-pill";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { useStudentAuditEvents } from "../shared/dh-queries";
import { QueryMessage } from "../shared/dh-ui";
import type { DirectoryStudent } from "../shared/students-types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function AuditTab({ student }: { student: DirectoryStudent }) {
  const audit = useStudentAuditEvents(student.id);
  if (!audit.data) return <QueryMessage query={audit} label="the audit log" />;
  const entries = audit.data;

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
              {dateFormatter.format(new Date(row.timestamp))}
            </span>
          ),
        },
        {
          header: "Who",
          cell: (row) => (
            <span
              className="block max-w-56 truncate font-medium"
              title={row.person}
            >
              {row.person}
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
