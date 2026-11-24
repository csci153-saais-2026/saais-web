import * as React from "react";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CohortGwaRow = {
  id: string;
  /** Entry year / batch, e.g. 2025. */
  entryYear: number | string;
  /** e.g. "2025–2029". Leave undefined on every row to hide the Study range column. */
  studyRange?: string;
  curriculum: string;
  students: number;
  /** Pre-formatted, e.g. "1.92" or "—". */
  meanGwa: string;
};

const HEAD =
  "text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase";

/**
 * Presentational "GWA by batch and curriculum" panel shared by the Adviser dashboard and the
 * Dean and Department Head reports: one row per cohort with a "View students →" action that
 * the caller wires to `CohortStudentsDialog`. Fetching and formatting stay with the caller.
 */
function CohortGwaTable({
  rows,
  onViewStudents,
  title = "GWA by batch and curriculum",
  description = "Entry year, study range, and academic performance for each cohort.",
  footer,
  emptyMessage = "No cohort records available.",
}: {
  rows: readonly CohortGwaRow[];
  /** Omit to hide the action column. */
  onViewStudents?: (
    row: CohortGwaRow,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  title?: string;
  description?: string;
  /** Caption under the table, e.g. "3 cohorts · All department programs". */
  footer?: React.ReactNode;
  emptyMessage?: React.ReactNode;
}) {
  const showStudyRange = rows.some((row) => row.studyRange !== undefined);
  const columnCount = 4 + (showStudyRange ? 1 : 0) + (onViewStudents ? 1 : 0);

  return (
    <Panel title={title} description={description} flush>
      <Table responsive aria-label={title}>
        <TableHeader className="bg-secondary">
          <TableRow>
            <TableHead className={HEAD}>Entry year</TableHead>
            {showStudyRange && (
              <TableHead className={HEAD}>Study range</TableHead>
            )}
            <TableHead className={HEAD}>Curriculum</TableHead>
            <TableHead className={HEAD}>Students</TableHead>
            <TableHead className={HEAD}>Mean GWA</TableHead>
            {onViewStudents && <TableHead aria-label="Actions" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell label="Entry year">{row.entryYear}</TableCell>
                {showStudyRange && (
                  <TableCell label="Study range">
                    {row.studyRange ?? "—"}
                  </TableCell>
                )}
                <TableCell label="Curriculum">
                  <span
                    className="block max-w-64 truncate max-md:max-w-none"
                    title={row.curriculum}
                  >
                    {row.curriculum}
                  </span>
                </TableCell>
                <TableCell label="Students">{row.students}</TableCell>
                <TableCell label="Mean GWA">{row.meanGwa}</TableCell>
                {onViewStudents && (
                  <TableCell label="Actions">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 py-1 font-semibold underline-offset-4"
                      aria-label={`View students for ${row.curriculum} batch ${row.entryYear}`}
                      onClick={(event) => onViewStudents(row, event)}
                    >
                      View students →
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-6 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {footer && (
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          {footer}
        </p>
      )}
    </Panel>
  );
}

export { CohortGwaTable };
