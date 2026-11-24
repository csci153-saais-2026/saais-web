import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  hour12: true,
});
const HEAD =
  "px-3.5 text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase";
const CELL = "px-3.5 py-2.5 text-[13.5px]";

export function AuditTab({ student }: { student: DirectoryStudent }) {
  const audit = useStudentAuditEvents(student.id);
  if (!audit.data) return <QueryMessage query={audit} label="the audit log" />;
  if (audit.data.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No audit events have been recorded for this student.
      </p>
    );
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table responsive aria-label="Student audit log">
        <TableHeader className="bg-secondary">
          <TableRow>
            {["Timestamp", "Person", "Action", "Details"].map((label) => (
              <TableHead key={label} className={HEAD}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {audit.data.map((event) => (
            <TableRow key={event.id}>
              <TableCell label="Timestamp" className={CELL}>
                <time dateTime={event.timestamp}>
                  {dateFormatter.format(new Date(event.timestamp))}
                </time>
              </TableCell>
              <TableCell label="Person" className={`${CELL} whitespace-normal`}>
                {event.person}
              </TableCell>
              <TableCell label="Action" className={CELL}>
                {event.action}
              </TableCell>
              <TableCell
                label="Details"
                className={`${CELL} whitespace-normal`}
              >
                <span className="min-w-0">
                  {event.record} · {event.details}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
