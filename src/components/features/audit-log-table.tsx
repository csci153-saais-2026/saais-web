import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DeanAuditEntry } from "@/routes/dean/types";
import { DeanAuditActionPill } from "@/routes/dean/audit-log/DeanAuditActionPill";

type DepartmentAuditEntry = {
  id: string;
  timestamp: ReactNode;
  person: string;
  action: ReactNode;
  student: string;
  record: string;
  details: string;
};

type AuditLogTableProps = { emptyMessage?: string } & (
  | { variant?: "dean"; entries: DeanAuditEntry[] }
  | { variant: "department-head"; entries: DepartmentAuditEntry[] }
);

export function AuditLogTable(props: AuditLogTableProps) {
  const isDepartmentHead = props.variant === "department-head";
  const rows = isDepartmentHead
    ? props.entries
    : props.entries.map((row) => ({
        ...row,
        person: row.actor,
        action: <DeanAuditActionPill action={row.action} />,
        record: "",
      }));
  const timestamp = isDepartmentHead ? "Timestamp" : "When";
  const person = isDepartmentHead ? "Person" : "Who";
  const headers = [
    timestamp,
    person,
    "Action",
    "Student",
    ...(isDepartmentHead ? ["Record"] : []),
    "Details",
  ];
  const headClass = isDepartmentHead
    ? "text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase"
    : undefined;
  const cellClass = isDepartmentHead ? "py-2.5 text-[13.5px]" : undefined;
  const wrappingText = "min-w-0 whitespace-normal wrap-break-word";
  const shortText = isDepartmentHead ? wrappingText : "block max-w-56 truncate";
  const detailText = isDepartmentHead
    ? wrappingText
    : "block max-w-96 truncate";

  return (
    <>
      <Table
        responsive
        aria-label={isDepartmentHead ? "Department audit log" : "Audit log"}
      >
        <TableHeader className={isDepartmentHead ? "bg-secondary" : undefined}>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className={headClass}>
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell
                label={timestamp}
                className={
                  cellClass ?? "font-mono text-xs text-muted-foreground"
                }
              >
                {row.timestamp}
              </TableCell>
              <TableCell label={person} className={cellClass ?? "font-medium"}>
                <span className={shortText} title={row.person}>
                  {row.person}
                </span>
              </TableCell>
              <TableCell label="Action" className={cellClass}>
                {row.action}
              </TableCell>
              <TableCell label="Student" className={cellClass}>
                <span className={shortText} title={row.student}>
                  {row.student}
                </span>
              </TableCell>
              {isDepartmentHead && (
                <TableCell
                  label="Record"
                  className={cn(cellClass, wrappingText)}
                >
                  {row.record}
                </TableCell>
              )}
              <TableCell label="Details" className={cellClass}>
                <span className={detailText} title={row.details}>
                  {row.details}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {!isDepartmentHead && rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className="py-10 text-center text-muted-foreground"
              >
                {props.emptyMessage ?? "No audit records match these filters."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {isDepartmentHead && rows.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {props.emptyMessage ?? "No audit records match these filters."}
        </p>
      )}
    </>
  );
}
