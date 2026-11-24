import { useState } from "react";
import type { ChecklistRow } from "@/components/features/checklist-term-group";
import {
  ChecklistView,
  type ChecklistViewTerm,
} from "@/components/features/checklist-view";
import { CourseInfoDialog } from "@/components/features/course-info-dialog";
import { DegreeProgress } from "@/components/features/degree-progress";
import type { Status } from "@/components/ui/status-badge";
import type { ApiSchema } from "@/lib/api";
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState";
import { useDeanStudentChecklist } from "@/routes/dean/students/use-dean-students";
import type { DeanStudentSummary } from "@/routes/dean/types";

const STATUS_MAP: Record<ApiSchema<"ChecklistSlotResult">["status"], Status> = {
  not_taken: "not-taken",
  currently_enrolled: "enrolled",
  passed: "passed",
  failed: "failed",
  inc: "inc",
  dr: "dr",
  na: "na",
};

const CATEGORY_LABELS: Record<
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

function buildChecklistTerms(data: {
  results: ApiSchema<"ChecklistSlotResult">[];
  slots: ApiSchema<"CurriculumTermCourse">[];
  terms: ApiSchema<"CurriculumTerm">[];
  courses: ApiSchema<"Course">[];
}): ChecklistViewTerm[] {
  const groups = new Map<string, ChecklistRow[]>();

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
    const attempts = result.attempts?.length ?? 0;

    const row: ChecklistRow = {
      code: course?.code ?? slot?.slot_label ?? "Requirement",
      title: course?.title ?? "Elective requirement",
      status: STATUS_MAP[result.status],
      unitsRequired: result.required_units,
      unitsEarned: result.earned_units,
      source:
        result.satisfaction_source ??
        (attempts > 0 ? "Direct attempt" : "Not yet satisfied"),
      attempts,
    };

    groups.set(title, [...(groups.get(title) ?? []), row]);
  }

  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([title, rows]) => ({
      id: title,
      title,
      passedUnits: rows.reduce((sum, r) => sum + r.unitsEarned, 0),
      totalUnits: rows.reduce((sum, r) => sum + r.unitsRequired, 0),
      rows,
    }));
}

export function DeanStudentChecklistTab({
  student,
}: {
  student: DeanStudentSummary;
}) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(
    null,
  );
  const checklistQuery = useDeanStudentChecklist(student.studentId);

  if (!checklistQuery.data) {
    return (
      <DeanQueryState
        isLoading={checklistQuery.isLoading}
        isError={checklistQuery.isError}
        label="student checklist"
        onRetry={() => void checklistQuery.refetch()}
      />
    );
  }

  const data = checklistQuery.data;
  const terms = buildChecklistTerms(data);

  const selectedCourse = selectedCourseCode
    ? (data.courses.find((c) => c.code === selectedCourseCode) ?? null)
    : null;
  const selectedSlot = selectedCourseCode
    ? (data.slots.find((s) =>
        selectedCourse
          ? s.course_id === selectedCourse.id
          : s.slot_label === selectedCourseCode,
      ) ?? null)
    : null;
  const selectedResult = selectedSlot
    ? (data.results.find(
        (r) => r.curriculum_term_course_id === selectedSlot.id,
      ) ?? null)
    : null;
  const selectedTerm = selectedSlot
    ? (data.terms.find((t) => t.id === selectedSlot.curriculum_term_id) ?? null)
    : null;

  const modalTitle = selectedCourse
    ? `${selectedCourse.code} · ${selectedCourse.title}`
    : (selectedSlot?.slot_label ?? selectedCourseCode ?? "Course info");

  const requiredUnits =
    selectedResult?.required_units ?? selectedCourse?.units ?? 0;
  const modalMeta = [
    `${requiredUnits} ${requiredUnits === 1 ? "unit" : "units"}`,
    selectedCourse?.category ? CATEGORY_LABELS[selectedCourse.category] : null,
    selectedTerm
      ? `${ordinal(selectedTerm.year_level)} Year, ${ordinal(selectedTerm.term_sequence)} Semester`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ChecklistView
        summary={
          <DegreeProgress
            program={student.program}
            curriculum={student.curriculum}
            earned={student.unitsEarned}
            required={student.unitsRequired}
          >
            Cumulative GWA:{" "}
            <strong className="font-mono text-primary">{student.gwa}</strong>
          </DegreeProgress>
        }
        terms={terms}
        onCourseInfo={(_termId, courseCode) => setSelectedCourseCode(courseCode)}
        emptyTitle="No checklist available"
        emptyMessage="No checklist is available for this curriculum."
      />

      <CourseInfoDialog
        open={selectedCourseCode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCourseCode(null);
        }}
        slot={selectedResult}
        title={modalTitle}
        meta={modalMeta}
      />
    </>
  );
}
