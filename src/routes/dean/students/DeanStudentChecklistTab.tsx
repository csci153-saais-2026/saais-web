import { useState } from "react";
import {
  ChecklistTermGroup,
  type ChecklistRow,
} from "@/components/features/checklist-term-group";
import { DegreeProgress } from "@/components/features/degree-progress";
import { XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const ATTEMPT_HEADERS = [
  "Attempt",
  "Term",
  "Midterm",
  "Final",
  "Completion",
  "Instructor",
  "Result",
];

function ordinal(n: number) {
  const suffix = new Intl.PluralRules("en", { type: "ordinal" }).select(n);
  return `${n}${suffix === "one" ? "st" : suffix === "two" ? "nd" : suffix === "few" ? "rd" : "th"}`;
}

function formatGrade(value: number | null | undefined) {
  return value == null ? null : value.toFixed(2);
}

function buildChecklistTerms(data: {
  results: ApiSchema<"ChecklistSlotResult">[];
  slots: ApiSchema<"CurriculumTermCourse">[];
  terms: ApiSchema<"CurriculumTerm">[];
  courses: ApiSchema<"Course">[];
}) {
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
    .map(([title, rows]) => ({ title, rows }));
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

  const attempts = selectedResult?.attempts ?? [];
  const fixes = selectedResult?.grade_fix_history ?? [];

  return (
    <div className="space-y-6">
      <DegreeProgress
        program={student.program}
        curriculum={student.curriculum}
        earned={student.unitsEarned}
        required={student.unitsRequired}
      >
        Cumulative GWA:{" "}
        <strong className="font-mono text-primary">{student.gwa}</strong>
      </DegreeProgress>

      {terms.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No checklist is available for this curriculum.
        </p>
      ) : (
        <div className="space-y-4">
          {terms.map((term) => (
            <ChecklistTermGroup
              key={term.title}
              title={term.title}
              passedUnits={term.rows.reduce((sum, r) => sum + r.unitsEarned, 0)}
              totalUnits={term.rows.reduce(
                (sum, r) => sum + r.unitsRequired,
                0,
              )}
              rows={term.rows}
              onCourseInfo={setSelectedCourseCode}
            />
          ))}
        </div>
      )}

      <Dialog
        open={selectedCourseCode !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCourseCode(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-240"
        >
          <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border px-5 pt-4.5 pb-4">
            <div>
              <DialogTitle>{modalTitle}</DialogTitle>
              <DialogDescription className="mt-1.5 text-[13px]">
                {modalMeta}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
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
            {selectedResult && (
              <div className="flex items-center gap-2.5 text-sm">
                <span>Status:</span>
                <StatusBadge status={STATUS_MAP[selectedResult.status]} />
                <span className="text-muted-foreground">
                  · {attempts.length}{" "}
                  {attempts.length === 1 ? "attempt" : "attempts"}
                </span>
              </div>
            )}

            {attempts.length > 0 ? (
              <Table className="mt-4">
                <TableHeader className="bg-secondary">
                  <TableRow>
                    {ATTEMPT_HEADERS.map((header) => (
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
                        {formatGrade(a.midterm_grade) ??
                          (a.midterm_status === "dr" ? "DR" : "—")}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.75">
                        {formatGrade(a.final_grade) ?? "—"}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.75">
                        {formatGrade(a.completion_grade) ?? "—"}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.75">
                        {a.instructor || "—"}
                      </TableCell>
                      <TableCell className="px-3.5 py-2.75">
                        <StatusBadge status={STATUS_MAP[a.effective_status]} />
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
            {fixes.length > 0 ? (
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
    </div>
  );
}
