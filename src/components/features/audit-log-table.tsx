import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DeanAuditEntry } from "@/routes/dean/types";
import { DeanAuditActionPill } from "@/routes/dean/audit-log/DeanAuditActionPill";

export function AuditLogTable({
  entries,
  emptyMessage = "No audit records match these filters.",
}: {
  entries: DeanAuditEntry[];
  emptyMessage?: string;
}) {
  return (
    <Table responsive aria-label="Audit log">
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Who</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length ? entries.map((row) => (
          <TableRow key={row.id}>
            <TableCell label="When" className="font-mono text-xs text-muted-foreground">{row.timestamp}</TableCell>
            <TableCell label="Who" className="font-medium"><span className="block max-w-56 truncate" title={row.actor}>{row.actor}</span></TableCell>
            <TableCell label="Action"><DeanAuditActionPill action={row.action} /></TableCell>
            <TableCell label="Student"><span className="block max-w-56 truncate" title={row.student}>{row.student}</span></TableCell>
            <TableCell label="Details"><span className="block max-w-96 truncate" title={row.details}>{row.details}</span></TableCell>
          </TableRow>
        )) : (
          <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{emptyMessage}</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}
