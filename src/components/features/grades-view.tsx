import * as React from "react";
import { ChevronDownIcon } from "@/components/icons";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type GradeRow = {
  id: string;
  code: string;
  title?: string;
  units: number;
  /** Pre-formatted, e.g. "1.75", "DR" or "—". */
  midterm: string;
  /** Pre-formatted final / completion grade, e.g. "2.00", "1.50 (INC)" or "—". */
  final: string;
  status: Status;
  /** Small line under the badge, e.g. "Due 12 Mar 2026" or "Repeated". */
  statusNote?: string;
};

export type GradesViewTerm = {
  id: string;
  /** e.g. "2025–2026 · 1st Semester". */
  title: string;
  /** Pre-formatted term GWA, or null when not available. */
  gwa: string | null;
  failedUnits?: number;
  locked?: boolean;
  rows: GradeRow[];
};

const HEAD =
  "text-[11.5px] font-semibold tracking-[0.1em] text-muted-2 uppercase";

/**
 * Presentational grades list shared by the Adviser, Dean and Student portals: one collapsible
 * panel per term (term GWA, failed units, locked state) with a responsive attempts table and
 * Expand all / Collapse all. Role-specific row actions (Flag grade, Correct grade) go in the
 * `rowAction` slot; leave it out for a read-only view.
 */
function GradesView({
  terms,
  rowAction,
  emptyMessage = "No academic term grades recorded yet.",
  footnote,
}: {
  terms: GradesViewTerm[];
  rowAction?: {
    /** Column header, e.g. "Flag". */
    header: string;
    render: (row: GradeRow, term: GradesViewTerm) => React.ReactNode;
  };
  emptyMessage?: React.ReactNode;
  /** Rendered under the list, e.g. the grading-rules advisory. */
  footnote?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const allCollapsed =
    terms.length > 0 && terms.every((term) => collapsed.has(term.id));

  function setOpen(id: string, open: boolean) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (terms.length === 0) {
    return (
      <Panel title="No grade records">
        <p className="py-6 text-center text-body text-muted-foreground">
          {emptyMessage}
        </p>
      </Panel>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-[38px]"
          onClick={() =>
            setCollapsed(
              allCollapsed ? new Set() : new Set(terms.map((t) => t.id)),
            )
          }
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
      </div>

      <div className="grid gap-1">
        {terms.map((term) => {
          const failed = term.failedUnits ?? 0;
          return (
            <Collapsible
              key={term.id}
              open={!collapsed.has(term.id)}
              onOpenChange={(open) => setOpen(term.id, open)}
              className="mb-4 overflow-hidden rounded-md border border-border bg-card"
            >
              <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between gap-4 bg-secondary px-5 py-4 text-left hover:bg-row-hover">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    {term.title}
                  </span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    Term GWA {term.gwa ?? "—"} · {failed}{" "}
                    {failed === 1 ? "failed unit" : "failed units"}
                    {term.locked !== undefined &&
                      ` · ${term.locked ? "Locked term" : "Open term"}`}
                  </span>
                </span>
                <ChevronDownIcon
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90"
                  aria-hidden
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                {term.rows.length > 0 ? (
                  <Table responsive>
                    <TableHeader className="bg-secondary">
                      <TableRow>
                        {[
                          "Course",
                          "Units",
                          "Midterm",
                          "Final / completion",
                          "Status",
                        ].map((label) => (
                          <TableHead key={label} scope="col" className={HEAD}>
                            {label}
                          </TableHead>
                        ))}
                        {rowAction && (
                          <TableHead scope="col" className={HEAD}>
                            {rowAction.header}
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {term.rows.map((row) => (
                        <TableRow key={row.id} className="border-line-soft">
                          <TableCell
                            label="Course"
                            className="px-3.5 py-row text-cell whitespace-normal max-md:flex-col max-md:items-start max-md:gap-0.5 max-md:text-left"
                          >
                            <strong className="block font-semibold text-foreground">
                              {row.code}
                            </strong>
                            {row.title && (
                              <span
                                className="line-clamp-2 block text-caption text-muted-foreground"
                                title={row.title}
                              >
                                {row.title}
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            label="Units"
                            className="px-3.5 py-row text-cell tabular-nums"
                          >
                            {row.units}
                          </TableCell>
                          <TableCell
                            label="Midterm"
                            className="px-3.5 py-row font-mono text-cell tabular-nums"
                          >
                            {row.midterm}
                          </TableCell>
                          <TableCell
                            label="Final / completion"
                            className="px-3.5 py-row font-mono text-cell tabular-nums"
                          >
                            {row.final}
                          </TableCell>
                          <TableCell
                            label="Status"
                            className="px-3.5 py-row text-cell"
                          >
                            <div className="flex flex-col items-end gap-1 md:items-start">
                              <StatusBadge status={row.status} />
                              {row.statusNote && (
                                <span className="text-caption text-muted-foreground">
                                  {row.statusNote}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {rowAction && (
                            <TableCell
                              label={rowAction.header}
                              className="px-3.5 py-row text-cell"
                            >
                              {rowAction.render(row, term)}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="px-5 py-8 text-center text-cell text-muted-foreground">
                    No attempts recorded in this term.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {footnote}
    </div>
  );
}

export { GradesView };
