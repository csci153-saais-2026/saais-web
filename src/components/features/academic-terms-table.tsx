import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

export type AcademicTermsTableRow = {
  id: string;
  academicYear: string;
  semester: string;
  termDates: string;
  encodingDeadline: string;
  status: "Open" | "Closed";
  closeAriaLabel?: string;
};

type AcademicTermsTableProps = {
  rows: readonly AcademicTermsTableRow[];
  onClose?: (row: AcademicTermsTableRow) => void;
  onView?: (row: AcademicTermsTableRow) => void;
  onEdit?: (row: AcademicTermsTableRow) => void;
  scopeLabel?: string;
};

const TH =
  "h-auto bg-secondary px-3.5 py-2.5 text-[11.5px] font-semibold tracking-[0.09em] text-muted-2 uppercase";
const TD = "px-3.5 py-[11px] text-[13.5px] leading-normal";

export function AcademicTermsTable({
  rows,
  onClose,
  onView,
  onEdit,
  scopeLabel = "Department scope",
}: AcademicTermsTableProps) {
  const openCount = rows.filter((row) => row.status === "Open").length;
  const closedCount = rows.length - openCount;

  return (
    <>
      <Table responsive className="text-[13.5px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={TH}>Academic year</TableHead>
            <TableHead className={TH}>Semester</TableHead>
            <TableHead className={TH}>Term dates</TableHead>
            <TableHead className={TH}>Encoding deadline</TableHead>
            <TableHead className={TH}>Status</TableHead>
            <TableHead className={TH} aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-5 py-8 text-center">
                No academic terms are available.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-line-soft hover:bg-line-soft"
              >
                <TableCell
                  label="Academic year"
                  className={`${TD} ${row.status === "Open" ? "font-semibold" : ""}`}
                >
                  {row.academicYear}
                </TableCell>
                <TableCell label="Semester" className={TD}>
                  {row.semester}
                </TableCell>
                <TableCell label="Term dates" className={TD}>
                  {row.termDates}
                </TableCell>
                <TableCell label="Encoding deadline" className={TD}>
                  {row.encodingDeadline}
                </TableCell>
                <TableCell label="Status" className={TD}>
                  <StatusBadge
                    status={row.status === "Open" ? "current" : "archived"}
                  >
                    {row.status}
                  </StatusBadge>
                </TableCell>
                <TableCell label="Actions" className={TD}>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.status === "Open" && onClose ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onClose(row)}
                        aria-label={
                          row.closeAriaLabel ??
                          `Close encoding for ${row.academicYear} ${row.semester}`
                        }
                      >
                        Close encoding
                      </Button>
                    ) : onView ? (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onView(row)}
                        className="h-auto px-0 py-1 text-[13px] font-semibold no-underline hover:no-underline"
                      >
                        View term
                      </Button>
                    ) : null}
                    {row.status === "Open" && onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(row)}
                      >
                        Edit term
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-xs text-muted-2">
        <span>
          {openCount} open {openCount === 1 ? "term" : "terms"} ·{" "}
          {closedCount} closed {closedCount === 1 ? "term" : "terms"}
        </span>
        <span>{scopeLabel}</span>
      </div>
    </>
  );
}
