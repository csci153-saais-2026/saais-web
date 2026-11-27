import * as React from "react";
import {
  ChecklistTermGroup,
  type ChecklistRow,
} from "@/components/features/checklist-term-table";
import { FormField } from "@/components/features/form-field";
import { Panel } from "@/components/features/panel";
import { StatGrid } from "@/components/features/stat-tile";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ChecklistViewTerm = {
  id: string;
  title: string;
  description?: string;
  passedUnits: number;
  totalUnits: number;
  /** Pre-formatted, e.g. "1.56". Omit to hide the Semester GWA figure. */
  semesterGwa?: string;
  rows: ChecklistRow[];
};

export type ChecklistFilterOption = { value: string; label: string };

const CHECKLIST_FILTER_OPTIONS: ChecklistFilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Not yet taken" },
  { value: "passed", label: "Passed / credited" },
  { value: "inc", label: "INC" },
  { value: "currently_enrolled", label: "Currently enrolled" },
  { value: "failed", label: "Failed" },
];

/**
 * Presentational curriculum checklist shared by the Adviser, Dean and Student portals:
 * summary tiles, an optional summary slot (e.g. `DegreeProgress`), the status filter with
 * Collapse all / Expand all, and one collapsible group per semester. Filtering, grouping and
 * the Course info dialog stay with the caller.
 */
function ChecklistView({
  stats,
  summary,
  filter,
  terms,
  onCourseInfo,
  emptyTitle = "No matching requirements",
  emptyMessage = "No curriculum requirements match the selected status filter.",
}: {
  stats?: React.ComponentProps<typeof StatGrid>["items"];
  /** Rendered between the tiles and the toolbar. */
  summary?: React.ReactNode;
  /** Omit to hide the status filter. */
  filter?: {
    value: string;
    onChange: (value: string) => void;
    options?: ChecklistFilterOption[];
  };
  terms: ChecklistViewTerm[];
  onCourseInfo?: (termId: string, courseCode: string) => void;
  emptyTitle?: string;
  emptyMessage?: React.ReactNode;
}) {
  const filterId = React.useId();
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const allCollapsed =
    terms.length > 0 && terms.every((term) => collapsed.has(term.id));

  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(terms.map((t) => t.id)));
  }

  function setOpen(id: string, open: boolean) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {stats && <StatGrid items={stats} />}
      {summary}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {filter && (
          <FormField
            label="Show requirements"
            htmlFor={filterId}
            className="w-full sm:w-60"
          >
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger
                id={filterId}
                aria-label="Show requirements"
                className="min-h-11 w-full md:min-h-[38px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(filter.options ?? CHECKLIST_FILTER_OPTIONS).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={toggleAll}
            disabled={terms.length === 0}
            className="min-h-11 md:min-h-[38px]"
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        </div>
      </div>

      {terms.length > 0 ? (
        <div className="grid gap-1">
          {terms.map((term) => (
            <ChecklistTermGroup
              key={term.id}
              title={term.title}
              description={
                term.description ??
                "Curriculum position · course availability depends on the school term."
              }
              passedUnits={term.passedUnits}
              totalUnits={term.totalUnits}
              semesterGwa={term.semesterGwa}
              rows={term.rows}
              open={!collapsed.has(term.id)}
              onOpenChange={(open) => setOpen(term.id, open)}
              onCourseInfo={(code) => onCourseInfo?.(term.id, code)}
            />
          ))}
        </div>
      ) : (
        <Panel title={emptyTitle}>
          <p className="py-6 text-center text-body text-muted-foreground">
            {emptyMessage}
          </p>
        </Panel>
      )}
    </div>
  );
}

export { ChecklistView };
