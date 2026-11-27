import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChecklistRow } from "@/components/features/checklist-term-table";
import {
  ChecklistView,
  type ChecklistViewTerm,
} from "@/components/features/checklist-view";
import { CourseInfoDialog } from "@/components/features/course-info-dialog";
import type { Status } from "@/components/ui/status-badge";
import type { ApiSchema } from "@/lib/api";
import { getChecklist } from "@/routes/adviser/advisees/checklist/record.api";
import { QueryMessage } from "../shared/dh-ui";
import type { DirectoryStudent } from "../shared/students-types";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";

const STATUS: Record<ApiSchema<"AttemptStatus">, Status> = {
  na: "na",
  failed: "failed",
  passed: "passed",
  inc: "inc",
  dr: "dr",
  currently_enrolled: "enrolled",
};
const CHECKLIST_STATUS: Record<
  ApiSchema<"ChecklistSlotResult">["status"],
  Status
> = { ...STATUS, not_taken: "not-taken" };

const CATEGORY: Record<NonNullable<ApiSchema<"Course">["category"]>, string> = {
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

type Checklist = Awaited<ReturnType<typeof getChecklist>>;
type ChecklistCourse = {
  result: Checklist["results"][number];
  title: string;
  meta: string;
};
type TermRow = ChecklistRow & { course: ChecklistCourse };
type TermGroup = Omit<ChecklistViewTerm, "rows"> & { rows: TermRow[] };

function toTerms(data: Checklist): TermGroup[] {
  const groups = new Map<string, TermRow[]>();
  for (const result of data.results) {
    const slot = data.slots.find(
      (item) => item.id === result.curriculum_term_course_id,
    );
    const term = data.terms.find(
      (item) => item.id === slot?.curriculum_term_id,
    );
    const course = data.courses.find((item) => item.id === slot?.course_id);
    const title = term
      ? `Year ${term.year_level} · Semester ${term.term_sequence}`
      : "Other requirements";
    const attempts = result.attempts ?? [];
    const row = {
      code: course?.code ?? slot?.slot_label ?? "Requirement",
      title: course?.title ?? "Elective requirement",
      status: CHECKLIST_STATUS[result.status],
      unitsRequired: result.required_units,
      unitsEarned: result.earned_units,
      source:
        result.satisfaction_source ??
        (attempts.length ? "Direct attempt" : "Not yet satisfied"),
      attempts: attempts.length,
    };
    const meta = [
      `${result.required_units} ${result.required_units === 1 ? "unit" : "units"}`,
      course?.category ? CATEGORY[course.category] : null,
      term
        ? `${ordinal(term.year_level)} Year, ${ordinal(term.term_sequence)} Semester`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    groups.set(title, [
      ...(groups.get(title) ?? []),
      {
        ...row,
        course: {
          result,
          title: course
            ? `${course.code} · ${course.title}`
            : (slot?.slot_label ?? "Requirement"),
          meta,
        },
      },
    ]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([title, rows]) => ({
      id: title,
      title,
      passedUnits: rows.reduce((total, row) => total + row.unitsEarned, 0),
      totalUnits: rows.reduce((total, row) => total + row.unitsRequired, 0),
      rows,
    }));
}

export function ChecklistTab({ student }: { student: DirectoryStudent }) {
  const [selected, setSelected] = useState<{
    course: ChecklistCourse;
    trigger: HTMLElement | null;
  } | null>(null);
  const checklist = useQuery({
    queryKey: [
      ...useDepartmentHeadQueryKey(["department-head", "checklist"]),
      student.id,
    ],
    queryFn: () => getChecklist(student.id),
  });
  if (!checklist.data)
    return <QueryMessage query={checklist} label="the checklist" />;
  const terms = toTerms(checklist.data);
  return (
    <>
      <ChecklistView
        terms={terms}
        onCourseInfo={(termId, code) => {
          const course = terms
            .find((term) => term.id === termId)
            ?.rows.find((row) => row.code === code)?.course;
          if (course) {
            const focused = document.activeElement;
            setSelected({
              course,
              trigger: focused instanceof HTMLButtonElement ? focused : null,
            });
          }
        }}
        emptyTitle="No checklist available"
        emptyMessage="No checklist is available for this curriculum."
      />
      {selected && (
        <CourseInfoDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          slot={selected.course.result}
          title={selected.course.title}
          meta={selected.course.meta}
          returnFocusTo={selected.trigger}
        />
      )}
    </>
  );
}
