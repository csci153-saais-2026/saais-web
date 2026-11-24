import * as React from "react";
import {
  GradeDistribution,
  type GradeBand,
} from "@/components/features/grade-distribution";
import { Panel } from "@/components/features/panel";
import { StatTile } from "@/components/features/stat-tile";
import { cn } from "@/lib/utils";

export type ReportStat = React.ComponentProps<typeof StatTile> & {
  /** Makes the tile a button (e.g. "With deficiencies · View list"). */
  onSelect?: () => void;
};

/**
 * Presentational report block shared by the Adviser dashboard and the Dean and Department
 * Head reports: a row of summary tiles and a "Final grade distribution" panel.
 */
function ReportStatsSection({
  stats,
  statsClassName = "lg:grid-cols-3",
  distribution,
}: {
  stats: ReportStat[];
  statsClassName?: string;
  distribution: {
    title: string;
    description?: string;
    bands: GradeBand[];
    /** Control in the panel header, e.g. a term select. */
    action?: React.ReactNode;
    /** Caption under the bars, e.g. "865 course grade records · Percentages sum to 100%." */
    footnote?: React.ReactNode;
    emptyMessage?: React.ReactNode;
  };
}) {
  const panel = (
    <Panel
      title={distribution.title}
      description={distribution.description}
      action={distribution.action}
      className="mb-0"
    >
      {distribution.bands.length > 0 ? (
        <GradeDistribution inline bands={distribution.bands} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {distribution.emptyMessage ?? "Grade distribution is not available."}
        </p>
      )}
      {distribution.footnote && (
        <p className="mt-5 text-xs text-muted-foreground">
          {distribution.footnote}
        </p>
      )}
    </Panel>
  );

  return (
    <div className="space-y-6">
      <div className={cn("grid gap-4 sm:grid-cols-2", statsClassName)}>
        {stats.map(({ onSelect, ...tile }) =>
          onSelect ? (
            <button
              key={tile.label}
              type="button"
              onClick={onSelect}
              className="rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&>div]:h-full [&>div]:transition-colors hover:[&>div]:bg-secondary/50"
            >
              <StatTile {...tile} />
            </button>
          ) : (
            <StatTile key={tile.label} {...tile} />
          ),
        )}
      </div>

      {panel}
    </div>
  );
}

export { ReportStatsSection };
