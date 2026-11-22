import * as React from "react";
import { Link } from "react-router";
import type { ApiSchema } from "@/lib/api/types";
import { Panel } from "@/components/features/panel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export type CourseRecommendationRow = ApiSchema<"AdvisingPlanItem"> & {
  readonly code?: string | null;
  readonly course_code?: string | null;
  readonly title?: string | null;
  readonly course_title?: string | null;
  readonly units?: number | null;
  readonly term_label?: string | null;
  readonly adviser_name?: string | null;
};

export interface CourseRecommendationsPanelProps {
  readonly items: readonly CourseRecommendationRow[];
  /** Optional lookup map by `course_offering_id` when `items` are raw `AdvisingPlanItem` rows. */
  readonly offeringDetails?: Readonly<
    Record<
      string,
      {
        readonly code: string;
        readonly title?: string | null;
        readonly units?: number | null;
        readonly termLabel?: string | null;
      }
    >
  >;
  readonly termLabel?: string | null;
  readonly adviserName?: string | null;
  readonly checklistHref?: string;
  readonly className?: string;
}

/**
 * Student Dashboard "Course Recommendations" panel.
 * Displays courses suggested by the adviser on the student's advising plan (`AdvisingPlanItem`),
 * kept distinct from recorded enrollment attempts.
 */
export function CourseRecommendationsPanel({
  items,
  offeringDetails,
  termLabel,
  adviserName,
  checklistHref = "/student/checklist",
  className,
}: CourseRecommendationsPanelProps) {
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => a.display_order - b.display_order);
  }, [items]);

  const statusBadgeExtraProps = {
    label: "Suggested",
  } as Record<string, unknown>;

  return (
    <Panel
      title="Course Recommendations"
      description="Suggested by your adviser; recorded enrollment is separate."
      action={
        <Button asChild variant="outline" size="sm">
          <Link to={checklistHref}>Open checklist</Link>
        </Button>
      }
      flush={sortedItems.length > 0}
      className={cn(className)}
    >
      {sortedItems.length > 0 ? (
        <div
          data-slot="recommendations-list"
          className="divide-y divide-line-soft"
        >
          {sortedItems.map((item) => {
            const lookup = offeringDetails?.[item.course_offering_id];
            const code =
              item.code?.trim() ||
              item.course_code?.trim() ||
              lookup?.code?.trim() ||
              item.course_offering_id;
            const title =
              item.title?.trim() ||
              item.course_title?.trim() ||
              lookup?.title?.trim() ||
              null;
            const units = item.units ?? lookup?.units ?? null;
            const resolvedTerm =
              item.term_label?.trim() ||
              lookup?.termLabel?.trim() ||
              termLabel?.trim() ||
              null;
            const resolvedAdviser =
              item.adviser_name?.trim() || adviserName?.trim() || null;

            const metaParts: string[] = [];
            if (units != null) {
              metaParts.push(`${units} ${units === 1 ? "unit" : "units"}`);
            }
            if (resolvedTerm) {
              metaParts.push(resolvedTerm);
            }
            if (resolvedAdviser) {
              metaParts.push(`suggested by ${resolvedAdviser}`);
            }

            return (
              <div
                key={item.id}
                data-slot="recommendation-row"
                className="flex items-start justify-between gap-3 px-5 py-3.5 text-cell"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1.5 text-foreground">
                    <strong className="font-mono font-semibold tabular-nums">
                      {code}
                    </strong>
                    {title && (
                      <>
                        <span aria-hidden="true" className="text-muted-2">
                          ·
                        </span>
                        <span className="font-semibold">{title}</span>
                      </>
                    )}
                  </div>
                  {metaParts.length > 0 && (
                    <p className="mt-1 font-mono text-caption tabular-nums text-muted-foreground">
                      {metaParts.join(" · ")}
                    </p>
                  )}
                </div>

                <StatusBadge
                  status={"enrolled" as never}
                  data-recommended-status="currently_enrolled"
                  {...statusBadgeExtraProps}
                >
                  Suggested
                </StatusBadge>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-5 text-center text-body text-muted-foreground">
          No recommendations yet.
        </p>
      )}
    </Panel>
  );
}
