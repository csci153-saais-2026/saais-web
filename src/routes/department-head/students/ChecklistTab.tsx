import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChecklistTermGroup,
  type ChecklistRow,
} from "@/components/features/checklist-term-group";
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
type TermGroup = {
  title: string;
  rows: (ChecklistRow & { course: ChecklistCourse })[];
};

function toTerms(data: Checklist): TermGroup[] {
  const groups = new Map<string, TermGroup["rows"]>();
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
    .map(([title, rows]) => ({ title, rows }));
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
    <div className="min-w-0 **:data-[slot=collapsible-trigger]:flex-wrap [&_[data-slot=collapsible-trigger]>span:first-child]:basis-full sm:**:data-[slot=collapsible-trigger]:flex-nowrap sm:[&_[data-slot=collapsible-trigger]>span:first-child]:basis-auto">
      {terms.map((term) => (
        <ChecklistTermGroup
          key={term.title}
          title={term.title}
          rows={term.rows}
          passedUnits={term.rows.reduce(
            (total, row) => total + row.unitsEarned,
            0,
          )}
          totalUnits={term.rows.reduce(
            (total, row) => total + row.unitsRequired,
            0,
          )}
          onCourseInfo={(code) => {
            const course = term.rows.find((row) => row.code === code)?.course;
            if (course) {
              const focused = document.activeElement;
              setSelected({
                course,
                trigger: focused instanceof HTMLButtonElement ? focused : null,
              });
            }
          }}
        />
      ))}
      {terms.length === 0 && (
        <p>No checklist is available for this curriculum.</p>
      )}
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
    </div>
  );
}
