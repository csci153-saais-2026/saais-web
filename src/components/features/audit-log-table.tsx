import type { Column } from "@/components/features/data-table-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function AuditLogTable<T>({
  columns,
  rows,
  rowKey,
  empty = "No audit records match these filters.",
  spacious = false,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  spacious?: boolean;
}) {
  return (
    <>
      <Table responsive aria-label="Audit log">
        <TableHeader className="bg-secondary">
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.header}
                className={cn(
                  "text-[11.5px] font-semibold tracking-widest text-muted-2 uppercase",
                  spacious && "h-auto px-3.5 py-2.5",
                  column.numeric && "text-right",
                )}
              >
                {column.headerContent ?? column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell
                  key={column.header}
                  label={column.header}
                  className={cn(
                    "py-2.5 text-[13.5px]",
                    spacious && "px-3.5 py-[11px]",
                    column.numeric && "text-right font-mono",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </>
  );
}
