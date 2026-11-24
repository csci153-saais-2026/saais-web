import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useState } from "react";
import { useParams } from "react-router";
import { AdviserPage } from "../../Adviser";
import { getChecklist } from "./record.api";
import { useScopedRequest } from "../use-scoped-request";
import { useAuth } from "@/hooks/use-auth";
import { ChecklistView } from "@/components/features/checklist-view";
import {
  CourseInfoDialog,
  type CourseInfoSlotRecord,
} from "@/components/features/course-info-dialog";
import { Button } from "@/components/ui/button";
import type { Status } from "@/components/ui/status-badge";
import type { ApiSchema } from "@/lib/api";

const statusMap: Record<ApiSchema<"ChecklistSlotResult">["status"], Status> = {
  not_taken: "not-taken",
  currently_enrolled: "enrolled",
  passed: "passed",
  failed: "failed",
  inc: "inc",
  dr: "dr",
  na: "na",
};
const deficiencyLabels: Record<
  ApiSchema<"StudentDeficiencyItem">["kind"],
  string
> = {
  failed: "Failed",
  open_inc: "Unresolved INC",
  lapsed_inc: "Lapsed INC",
  open_flag: "Open grade flag",
  unmet_prerequisite: "Unmet prerequisite",
};
function deficiencyNote(data: Awaited<ReturnType<typeof getChecklist>>) {
  // Grade flags are review requests, not academic deficiencies.
  if (data.summary.deficiencies) {
    const details = data.summary.deficiencies
      .filter((item) => item.kind !== "open_flag")
      .map((item) => `${deficiencyLabels[item.kind]}: ${item.course_code}`);
    if (details.length) return details.join(" · ");
    // Array present but empty — fall back to the count for the note.
    if (data.summary.deficiencies_count)
      return `${data.summary.deficiencies_count} deficiencie${data.summary.deficiencies_count === 1 ? "" : "s"} (details unavailable)`;
    return "No deficiencies";
  }
  // Legacy path: reconstruct from checklist rows when deficiencies array is absent.
  const details = data.results.flatMap((row) => {
    if (row.status !== "inc" && row.status !== "failed") return [];
    const slot = data.slots.find(
      (item) => item.id === row.curriculum_term_course_id,
    );
    const course = data.courses.find((item) => item.id === slot?.course_id);
    if (!course) return [];
    return [
      `${row.status === "inc" ? "Unresolved INC" : "Failed"}: ${course.code}`,
    ];
  });
  const unique = [...new Set(details)];
  if (data.summary.deficiencies_count == null)
    return unique.length ? unique.join(" · ") : "Details unavailable";
  if (data.summary.deficiencies_count > unique.length)
    unique.push(
      unique.length ? "Additional details unavailable" : "Details unavailable",
    );
  return unique.length ? unique.join(" · ") : "No deficiencies";
}
function yearStanding(year: number | undefined) {
  if (year == null) return "—";
  const suffix = new Intl.PluralRules("en", { type: "ordinal" }).select(year);
  return `${year}${suffix === "one" ? "st" : suffix === "two" ? "nd" : suffix === "few" ? "rd" : "th"} year`;
}
const categoryLabels: Record<
  NonNullable<ApiSchema<"Course">["category"]>,
  string
> = {
  major: "Major",
  ge: "GE",
  elective: "Elective",
  pe: "PE",
  nstp: "NSTP",
  foundation: "Foundation",
  service: "Service",
};
function ordinal(n: number) {
  const suffix = new Intl.PluralRules("en", { type: "ordinal" }).select(n);
  return `${n}${suffix === "one" ? "st" : suffix === "two" ? "nd" : suffix === "few" ? "rd" : "th"}`;
}
const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_taken", label: "Not yet taken" },
  { value: "passed", label: "Passed / credited" },
  { value: "inc", label: "INC" },
  { value: "currently_enrolled", label: "Currently enrolled" },
  { value: "failed", label: "Failed" },
];
export default function AdviseeChecklist() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<CourseInfoSlotRecord | null>(null);
  const key = JSON.stringify([user?.id, id, revision]);
  const { data, error } = useScopedRequest(key, !!user?.id && !!id, () =>
    getChecklist(id!),
  );
  const matchesFilter = (row: ApiSchema<"ChecklistSlotResult">) =>
    filter === "all" || row.status === filter;
  const groups = new Map<string, ApiSchema<"ChecklistSlotResult">[]>();
  for (const row of data?.results ?? []) {
    const slot = data?.slots.find(
      (s) => s.id === row.curriculum_term_course_id,
    );
    const term = data?.terms.find((t) => t.id === slot?.curriculum_term_id);
    const label = term
      ? `Year ${term.year_level} · Semester ${term.term_sequence}`
      : "Other requirements";
    groups.set(label, [...(groups.get(label) ?? []), row]);
  }
  const visibleGroups = [...groups]
    .filter(([, items]) => items.some(matchesFilter))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  function describe(r: ApiSchema<"ChecklistSlotResult">) {
    const slot = data?.slots.find((s) => s.id === r.curriculum_term_course_id);
    const course = data?.courses.find((c) => c.id === slot?.course_id);
    const term = data?.terms.find((t) => t.id === slot?.curriculum_term_id);
    const meta = [
      `${r.required_units} ${r.required_units === 1 ? "unit" : "units"}`,
      course?.category ? categoryLabels[course.category] : null,
      term
        ? `${ordinal(term.year_level)} Year, ${ordinal(term.term_sequence)} Semester`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const code = course?.code ?? slot?.slot_label ?? "Requirement unavailable";
    return {
      slot,
      course,
      code,
      meta,
      dialogSlot: {
        ...r,
        code,
        title: course?.title ?? null,
        meta,
      } satisfies CourseInfoSlotRecord,
    };
  }

  const terms = visibleGroups.map(([label, items]) => ({
    id: label,
    title: label,
    passedUnits: items.reduce((sum, item) => sum + item.earned_units, 0),
    totalUnits: items.reduce((sum, item) => sum + item.required_units, 0),
    rows: items.filter(matchesFilter).map((r) => {
      const { slot, course, code } = describe(r);
      const sourceAttempt = r.attempts?.find(
        (attempt) => attempt.attempt_id === r.source_attempt_id,
      );
      const sourceGrade =
        sourceAttempt?.completion_grade ?? sourceAttempt?.final_grade;
      const sourceDetail = [
        r.credited_course_code,
        sourceGrade != null ? `grade ${sourceGrade.toFixed(2)}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        code,
        title:
          course?.title ??
          (slot ? "Elective requirement" : r.curriculum_term_course_id),
        unitsEarned: r.earned_units,
        unitsRequired: r.required_units,
        status: statusMap[r.status],
        source: r.satisfaction_source ?? "—",
        sourceDetail: sourceDetail || undefined,
        attempts: r.attempts?.length ?? 0,
      };
    }),
  }));

  return (
    <AdviserPage title="Checklist" tab="checklist" sample={false}>
      <AccountSkeleton
        id="AdviseeChecklist-1"
        loading={!data && !error}
        label="Loading checklist…"
      >
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setRevision((n) => n + 1)}>
              Try again
            </Button>
          </div>
        )}
        {data && (
          <>
            <ChecklistView
              stats={[
                {
                  label: "Cumulative GWA",
                  value: data.summary.gwa?.toFixed(2) ?? "—",
                  note: "Unit-weighted counted attempts",
                },
                {
                  label: "Counted units",
                  value: data.summary.counted_units ?? "—",
                  valueSuffix: `/ ${data.summary.required_units}`,
                  note: `Of ${data.summary.required_units} total units. Excludes unresolved, unexpired INC`,
                },
                {
                  label: "Year Standing",
                  value: yearStanding(data.summary.year_level),
                  note: `${data.summary.earned_units} of ${data.summary.required_units} units earned`,
                },
                {
                  label: "Deficiencies",
                  value: data.summary.deficiencies_count ?? "—",
                  note: deficiencyNote(data),
                },
              ]}
              filter={{
                value: filter,
                onChange: setFilter,
                options: FILTER_OPTIONS,
              }}
              terms={terms}
              onCourseInfo={(termId, code) => {
                const items = groups.get(termId) ?? [];
                const match = items.find((r) => describe(r).code === code);
                if (match) setSelected(describe(match).dialogSlot);
              }}
              emptyMessage="No requirements match this filter."
            />
            <CourseInfoDialog
              open={selected !== null}
              onOpenChange={(open) => {
                if (!open) setSelected(null);
              }}
              slot={selected}
            />
          </>
        )}
      </AccountSkeleton>
    </AdviserPage>
  );
}
