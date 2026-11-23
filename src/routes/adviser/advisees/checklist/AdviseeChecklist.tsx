import { useState } from "react";
import { useParams } from "react-router";
import { AdviserPage } from "../../Adviser";
import { getChecklist } from "./record.api";
import { useScopedRequest } from "../use-scoped-request";
import { useAuth } from "@/hooks/use-auth";
import { StatGrid } from "@/components/features/stat-tile";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, XIcon } from "@/components/icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Kicker } from "@/components/ui/kicker";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  // When the API provides the full deficiencies array, use it directly. F-02
  // treats every open grade flag as a deficiency, including flags on passed
  // attempts, so open_flag entries must never be filtered out here.
  if (data.summary.deficiencies) {
    const details = data.summary.deficiencies.map(
      (item) => `${deficiencyLabels[item.kind]}: ${item.course_code}`,
    );
    if (details.length) return details.join(" · ");
    // Array present but empty — fall back to the count for the note.
    if (data.summary.deficiencies_count)
      return `${data.summary.deficiencies_count} deficiencie${data.summary.deficiencies_count === 1 ? "" : "s"} (details unavailable)`;
    // Also check open_flags_count: flags are deficiencies even when other
    // counts are zero (F-02).
    if (data.summary.open_flags_count)
      return `${data.summary.open_flags_count} open grade flag${data.summary.open_flags_count === 1 ? "" : "s"}`;
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
  // Account for open flags that are not visible in checklist rows.
  const flagCount = data.summary.open_flags_count ?? 0;
  if (flagCount > 0 && !unique.some((d) => d.startsWith("Open grade flag")))
    unique.push(`${flagCount} open grade flag${flagCount === 1 ? "" : "s"}`);
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
const attemptHeaders = [
  "Attempt",
  "Term",
  "Midterm",
  "Final",
  "Completion",
  "Instructor",
  "Result",
];
const grade = (value: number | null | undefined) =>
  value == null ? null : value.toFixed(2);
function AttemptDetails({
  row,
  title,
  meta,
}: {
  row: ApiSchema<"ChecklistSlotResult">;
  title: string;
  meta: string;
}) {
  const attempts = row.attempts ?? [];
  const fixes = row.grade_fix_history ?? [];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-lg px-3 py-1.5 text-[13px] font-semibold"
        >
          Course info
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-240"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-5 pt-4.5 pb-4">
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1.5 text-[13px]">
              {meta}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8.5 shrink-0 text-muted-foreground"
              aria-label="Close"
            >
              <XIcon className="size-4.5" aria-hidden />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="p-5">
          <div className="flex items-center gap-2.5 text-sm">
            <span>Status:</span>
            <StatusBadge status={statusMap[row.status]} />
            <span className="text-muted-foreground">
              · {attempts.length}{" "}
              {attempts.length === 1 ? "attempt" : "attempts"}
            </span>
          </div>
          {attempts.length ? (
            <Table className="mt-4">
              <TableHeader className="bg-secondary">
                <TableRow>
                  {attemptHeaders.map((header) => (
                    <TableHead
                      key={header}
                      className="px-3.5 text-[11.5px] font-semibold tracking-[0.09em] whitespace-nowrap text-muted-2 uppercase"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a, index) => (
                  <TableRow key={a.attempt_id}>
                    <TableCell className="px-3.5 py-2.75">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-3.5 py-2.75 whitespace-normal">
                      {a.term_label}
                    </TableCell>
                    <TableCell className="px-3.5 py-2.75">
                      {grade(a.midterm_grade) ??
                        (a.midterm_status === "dr" ? "DR" : "—")}
                    </TableCell>
                    <TableCell className="px-3.5 py-2.75">
                      {grade(a.final_grade) ?? "—"}
                    </TableCell>
                    <TableCell className="px-3.5 py-2.75">
                      {grade(a.completion_grade) ?? "—"}
                    </TableCell>
                    <TableCell className="px-3.5 py-2.75">
                      {a.instructor || "—"}
                    </TableCell>
                    <TableCell className="px-3.5 py-2.75">
                      <StatusBadge status={statusMap[a.effective_status]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="mt-4 text-[13.5px] text-muted-foreground">
              No attempts recorded yet.
            </p>
          )}
          <h3 className="mt-5.5 text-[15.5px] font-semibold">
            Grade fix history
          </h3>
          {fixes.length ? (
            <ul className="mt-2.5 grid gap-1.5 text-[13.5px] text-muted-foreground">
              {fixes.map((entry, index) => (
                <li key={`${entry.changed_at}:${index}`}>
                  {new Date(entry.changed_at).toLocaleString()} ·{" "}
                  {entry.old_grade ?? "—"} → {entry.new_grade ?? "—"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              No grade fixes recorded.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export default function AdviseeChecklist() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
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
  const allCollapsed =
    visibleGroups.length > 0 &&
    visibleGroups.every(([label]) => !expanded.has(label));
  return (
    <AdviserPage title="Checklist" tab="checklist" sample={false}>
      {!data && !error && <p role="status">Loading checklist…</p>}
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
          <StatGrid
            items={[
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
                // F-02: open grade flags count as deficiencies. Use the
                // greater of deficiencies_count and open_flags_count so that
                // a student with open flags on already-passed courses is never
                // shown "0" here while the Grade Flags page shows open flags.
                value:
                  data.summary.deficiencies_count != null
                    ? Math.max(
                        data.summary.deficiencies_count,
                        data.summary.open_flags_count ?? 0,
                      )
                    : "—",
                note: deficiencyNote(data),
              },
            ]}
          />
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <label className="grid w-56 gap-1 text-sm">
              Show requirements
              <select
                className="rounded-md border border-input bg-card px-3 py-2"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="not_taken">Not yet taken</option>
                <option value="passed">Passed / credited</option>
                <option value="inc">INC</option>
                <option value="currently_enrolled">Currently enrolled</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <Button
              variant="outline"
              className="ml-auto"
              disabled={visibleGroups.length === 0}
              onClick={() =>
                setExpanded((previous) => {
                  const next = new Set(previous);
                  for (const [label] of visibleGroups) {
                    if (allCollapsed) next.add(label);
                    else next.delete(label);
                  }
                  return next;
                })
              }
            >
              {allCollapsed ? "Expand All" : "Collapse All"}
            </Button>
          </div>
          {!visibleGroups.length && <p>No requirements match this filter.</p>}
          {visibleGroups.map(([label, items]) => {
            const passedUnits = items.reduce(
              (sum, item) => sum + item.earned_units,
              0,
            );
            const totalUnits = items.reduce(
              (sum, item) => sum + item.required_units,
              0,
            );
            return (
              <Collapsible
                key={label}
                open={expanded.has(label)}
                onOpenChange={(open) =>
                  setExpanded((previous) => {
                    const next = new Set(previous);
                    if (open) next.add(label);
                    else next.delete(label);
                    return next;
                  })
                }
                className="mb-4 min-w-0 overflow-hidden rounded-md border border-border bg-card"
              >
                <CollapsibleTrigger
                  className={`flex w-full flex-wrap items-start justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/40 ${expanded.has(label) ? "border-b border-line-soft" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold">
                      {label}
                    </span>
                    <span className="mt-0.75 block text-[13px] text-muted-foreground">
                      Curriculum position · course availability depends on the
                      school term.
                    </span>
                  </span>
                  <span className="flex items-center gap-5 text-right sm:gap-7">
                    <span>
                      <Kicker className="block text-[10px]">
                        Passed units
                      </Kicker>
                      <span className="font-heading font-bold text-primary">
                        {passedUnits}/{totalUnits}
                      </span>
                    </span>
                    <span>
                      <Kicker className="block text-[10px]">Total units</Kicker>
                      <span className="font-heading font-bold text-primary">
                        {totalUnits}
                      </span>
                    </span>
                    <span>
                      <Kicker className="block text-[10px]">
                        Semester GWA
                      </Kicker>
                      <span
                        className="font-heading font-bold text-primary"
                        aria-label="Semester GWA unavailable"
                      >
                        —
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`size-4 text-muted-foreground transition-transform ${expanded.has(label) ? "" : "-rotate-90"}`}
                      aria-hidden
                    />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table responsive className="table-auto">
                    <colgroup>
                      {[27, 15, 13, 21, 11, 13].map((w, i) => (
                        <col key={i} style={{ width: `${w}%` }} />
                      ))}
                    </colgroup>
                    <TableHeader>
                      <TableRow className="border-b border-border hover:bg-secondary">
                        {[
                          "Requirement",
                          "Units earned / required",
                          "Status",
                          "Satisfaction source",
                          "Attempts",
                          "Course info",
                        ].map((header) => (
                          <TableHead
                            key={header}
                            className="h-auto bg-secondary px-3.5 py-2.5 text-[11.5px] font-semibold tracking-[0.09em] text-muted-2 uppercase"
                          >
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.filter(matchesFilter).map((r) => {
                        const slot = data.slots.find(
                          (s) => s.id === r.curriculum_term_course_id,
                        );
                        const course = data.courses.find(
                          (c) => c.id === slot?.course_id,
                        );
                        const title = course
                          ? `${course.code} · ${course.title}`
                          : (slot?.slot_label ?? "Requirement");
                        const term = data.terms.find(
                          (t) => t.id === slot?.curriculum_term_id,
                        );
                        const meta = [
                          `${r.required_units} ${r.required_units === 1 ? "unit" : "units"}`,
                          course?.category
                            ? categoryLabels[course.category]
                            : null,
                          term
                            ? `${ordinal(term.year_level)} Year, ${ordinal(term.term_sequence)} Semester`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        const sourceAttempt = r.attempts?.find(
                          (attempt) =>
                            attempt.attempt_id === r.source_attempt_id,
                        );
                        const sourceGrade =
                          sourceAttempt?.completion_grade ??
                          sourceAttempt?.final_grade;
                        return (
                          <TableRow
                            key={r.curriculum_term_course_id}
                            className="border-line-soft"
                          >
                            <TableCell
                              label="Requirement"
                              className="px-3.5 py-2.75 text-[13.5px] whitespace-normal"
                            >
                              <b className="block font-semibold">
                                {course?.code ??
                                  slot?.slot_label ??
                                  "Requirement unavailable"}
                              </b>
                              <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                                {course?.title ??
                                  (slot
                                    ? "Elective requirement"
                                    : r.curriculum_term_course_id)}
                              </span>
                            </TableCell>
                            <TableCell
                              label="Units earned / required"
                              className="px-3.5 py-2.75 text-[13.5px] whitespace-normal"
                            >
                              {r.earned_units} / {r.required_units}
                            </TableCell>
                            <TableCell
                              label="Status"
                              className="px-3.5 py-2.75 text-[13.5px] whitespace-normal"
                            >
                              <StatusBadge status={statusMap[r.status]} />
                            </TableCell>
                            <TableCell
                              label="Satisfaction source"
                              className="px-3.5 py-2.75 text-[13.5px] whitespace-normal"
                            >
                              {r.satisfaction_source ?? "—"}
                              {(r.credited_course_code ||
                                sourceGrade != null) && (
                                <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                                  {r.credited_course_code}
                                  {r.credited_course_code && sourceGrade != null
                                    ? " · "
                                    : ""}
                                  {sourceGrade != null
                                    ? `grade ${sourceGrade.toFixed(2)}`
                                    : ""}
                                </span>
                              )}
                            </TableCell>
                            <TableCell
                              label="Attempts"
                              className="px-3.5 py-2.75 text-[13.5px] whitespace-normal"
                            >
                              {r.attempts?.length
                                ? `${r.attempts.length} ${r.attempts.length === 1 ? "attempt" : "attempts"}`
                                : "—"}
                            </TableCell>
                            <TableCell
                              label="Course info"
                              className="px-3.5 py-2.75 text-[13.5px] whitespace-normal"
                            >
                              <AttemptDetails
                                row={r}
                                title={title}
                                meta={meta}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </>
      )}
    </AdviserPage>
  );
}
