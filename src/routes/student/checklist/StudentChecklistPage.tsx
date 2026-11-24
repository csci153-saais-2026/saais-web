import { AccountSkeleton } from "@/components/features/loading-skeletons";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type ChecklistFilterOption,
  ChecklistView,
  type ChecklistViewTerm,
} from "@/components/features/checklist-view";
import { type ChecklistRow } from "@/components/features/checklist-term-table";
import {
  CourseInfoDialog,
  type CourseInfoSlotRecord,
} from "@/components/features/course-info-dialog";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import {
  ReportPdfPreviewDialog,
  type ReportAuditEventType,
} from "@/components/features/report-pdf-preview-dialog";
import { Button } from "@/components/ui/button";
import type { Status } from "@/components/ui/status-badge";
import { fetchAllPages } from "../fetch-all-pages";
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import {
  formatChecklistReport,
  formatTwoDecimalGrade,
  type PdfReportPayload,
} from "@/lib/pdf/student-report-formatter";
import {
  useRecordChecklistExport,
  useStudentChecklist,
} from "./use-student-checklist";

type ChecklistFilterValue =
  | "all"
  | "open"
  | "passed"
  | "inc"
  | "currently_enrolled";

const STUDENT_CHECKLIST_FILTER_OPTIONS: ChecklistFilterOption[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Not yet taken" },
  { value: "passed", label: "Passed / credited" },
  { value: "inc", label: "INC" },
  { value: "currently_enrolled", label: "Currently enrolled" },
];

export interface ChecklistSlotDisplayItem extends ApiSchema<"ChecklistSlotResult"> {
  readonly code: string;
  readonly title: string;
  readonly slotType?: ApiSchema<"CurriculumSlotType">;
  readonly isLapsedInc?: boolean;
}

export interface ChecklistTermSection {
  readonly id: string;
  readonly yearLevel: number;
  readonly termSequence: number;
  readonly title: string;
  readonly description?: string;
  readonly slots: readonly ChecklistSlotDisplayItem[];
}

export interface StudentChecklistViewProps {
  readonly summary: ApiSchema<"AcademicSummary">;
  readonly terms: readonly ChecklistTermSection[];
  readonly studentName?: string | null;
  readonly studentNumber?: string | null;
  readonly programLabel?: string | null;
  readonly curriculumLabel?: string | null;
  readonly adviserName?: string | null;
  readonly department?: Partial<ApiSchema<"Department">> | null;
  readonly faculty?: Partial<ApiSchema<"Faculty">> | null;
  readonly onPrintReport?: (eventType: ReportAuditEventType) => void;
}

function formatYearStanding(yearLevel?: number | null): string {
  const n = yearLevel ?? 1;
  if (n === 1) return "1st year";
  if (n === 2) return "2nd year";
  if (n === 3) return "3rd year";
  return `${n}th year`;
}

function formatTermSequenceLabel(termSequence: number): string {
  if (termSequence === 1) return "Semester 1";
  if (termSequence === 2) return "Semester 2";
  if (termSequence === 3) return "Summer";
  return `Term ${termSequence}`;
}

function mapSlotStatusToBadge(
  status: ApiSchema<"ChecklistSlotResult">["status"],
  isLapsedInc?: boolean,
): Status {
  if (status === "inc" && isLapsedInc) return "inc-lapsed";
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "inc":
      return "inc";
    case "currently_enrolled":
      return "enrolled";
    case "dr":
      return "dr";
    case "na":
      return "na";
    case "not_taken":
    default:
      return "not-taken";
  }
}

function pickSourceAttempt(
  slot: Pick<
    ApiSchema<"ChecklistSlotResult">,
    "attempts" | "source_attempt_id"
  >,
) {
  const attempts = slot.attempts ?? [];
  return (
    (slot.source_attempt_id
      ? attempts.find((a) => a.attempt_id === slot.source_attempt_id)
      : undefined) ?? attempts[attempts.length - 1]
  );
}

function getEffectiveGradeFromSlot(
  slot: ChecklistSlotDisplayItem,
): number | string | null {
  const sourceAttempt = pickSourceAttempt(slot);
  if (!sourceAttempt) return null;
  if (sourceAttempt.completion_grade != null) {
    return sourceAttempt.completion_grade;
  }
  if (sourceAttempt.final_grade != null) {
    return sourceAttempt.final_grade;
  }
  if (sourceAttempt.recorded_status === "inc") {
    return slot.isLapsedInc ? 5 : "INC";
  }
  if (sourceAttempt.recorded_status === "dr") return "DR";
  if (sourceAttempt.recorded_status === "na") return "NA";
  return null;
}

function slotMatchesFilter(
  slot: ChecklistSlotDisplayItem,
  filter: ChecklistFilterValue,
): boolean {
  if (filter === "all") return true;
  if (filter === "open") return slot.status === "not_taken";
  return slot.status === filter;
}

function buildRowFromSlot(slot: ChecklistSlotDisplayItem): ChecklistRow {
  const grade = getEffectiveGradeFromSlot(slot);
  const sourceLabel =
    slot.satisfaction_source ??
    (slot.status === "not_taken" ? "Not yet taken" : "Direct");
  const creditedCode = slot.credited_course_code?.trim() || slot.code;
  const gradeDisplay =
    grade != null
      ? formatTwoDecimalGrade(grade, "—")
      : slot.status === "not_taken"
        ? null
        : "—";
  const sourceDetail =
    slot.status === "not_taken"
      ? undefined
      : `${creditedCode} · grade ${gradeDisplay ?? "—"}`;

  return {
    code: slot.code,
    title: slot.title,
    unitsEarned: slot.earned_units,
    unitsRequired: slot.required_units,
    status: mapSlotStatusToBadge(slot.status, slot.isLapsedInc),
    source: sourceLabel,
    sourceDetail,
    attempts: slot.attempts?.length ?? 0,
  };
}

function toCourseInfoSlotRecord(
  slot: ChecklistSlotDisplayItem,
  term: ChecklistTermSection,
): CourseInfoSlotRecord {
  return {
    ...slot,
    code: slot.code,
    title: slot.title,
    meta: `${slot.required_units} ${
      slot.required_units === 1 ? "unit" : "units"
    } · ${term.title}`,
    is_lapsed_inc: slot.isLapsedInc,
  };
}

/**
 * Pure Student Curriculum Checklist view accepting typed `ApiSchema` payloads.
 */
export function StudentChecklistView({
  summary,
  terms,
  studentName,
  studentNumber,
  programLabel,
  curriculumLabel,
  adviserName,
  department,
  faculty,
  onPrintReport,
}: StudentChecklistViewProps) {
  const [filter, setFilter] = React.useState<ChecklistFilterValue>("all");
  const [selectedSlot, setSelectedSlot] =
    React.useState<CourseInfoSlotRecord | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const filteredTerms = React.useMemo(() => {
    return terms
      .map((term) => ({
        ...term,
        slots: term.slots.filter((slot) => slotMatchesFilter(slot, filter)),
      }))
      .filter((term) => term.slots.length > 0);
  }, [terms, filter]);

  const checklistTerms = React.useMemo<ChecklistViewTerm[]>(() => {
    return filteredTerms.map((term) => {
      const allTermSlots =
        terms.find((item) => item.id === term.id)?.slots ?? term.slots;
      const passedUnits = allTermSlots.reduce(
        (acc, slot) => acc + slot.earned_units,
        0,
      );
      const totalUnits = allTermSlots.reduce(
        (acc, slot) => acc + slot.required_units,
        0,
      );

      return {
        id: term.id,
        title: term.title,
        description: term.description,
        passedUnits,
        totalUnits,
        rows: term.slots.map(buildRowFromSlot),
      };
    });
  }, [filteredTerms, terms]);

  const reportPayload = React.useMemo<PdfReportPayload>(() => {
    return formatChecklistReport({
      studentName,
      studentNumber,
      programLabel,
      curriculumLabel,
      adviserName,
      department,
      faculty,
      earnedUnits: summary.earned_units,
      requiredUnits: summary.required_units,
      sections: filteredTerms.map((term) => ({
        title: term.title,
        slots: term.slots.map((slot) => ({
          code: slot.code,
          title: slot.title,
          requiredUnits: slot.required_units,
          earnedUnits: slot.earned_units,
          status: slot.status,
          finalGrade: getEffectiveGradeFromSlot(slot),
          isLapsedInc: slot.isLapsedInc,
        })),
      })),
    });
  }, [
    studentName,
    studentNumber,
    programLabel,
    curriculumLabel,
    adviserName,
    department,
    faculty,
    summary.earned_units,
    summary.required_units,
    filteredTerms,
  ]);

  const gwaDisplay =
    summary.gwa === null ? "Not available" : summary.gwa.toFixed(2);
  const countedUnits = summary.counted_units ?? summary.earned_units;
  const deficiencies = summary.deficiencies ?? [];
  const deficienciesCount = summary.deficiencies_count ?? deficiencies.length;
  const deficiencyNote =
    deficienciesCount > 0
      ? deficiencies
          .slice(0, 2)
          .map((d) => d.course_code)
          .join(", ")
      : "No open deficiencies";

  return (
    <div>
      <PageHeading
        title="Your curriculum, at a glance."
        subtitle="Every requirement, with a clear record of how it is satisfied."
        actions={
          <Button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={terms.length === 0}
            className="min-h-11 md:min-h-[38px]"
          >
            Download Checklist
          </Button>
        }
      />

      <ChecklistView
        stats={[
          {
            label: "Cumulative GWA",
            value: gwaDisplay,
            note: "Unit-weighted counted attempts",
          },
          {
            label: "Counted units",
            value: countedUnits,
            note: "Excludes unresolved, unexpired INC",
          },
          {
            label: "Year standing",
            value: formatYearStanding(summary.year_level),
            note: `${summary.earned_units} of ${summary.required_units} units earned`,
          },
          {
            label: "Deficiencies",
            value: deficienciesCount,
            note: deficiencyNote,
          },
        ]}
        filter={{
          value: filter,
          onChange: (value) => setFilter(value as ChecklistFilterValue),
          options: STUDENT_CHECKLIST_FILTER_OPTIONS,
        }}
        terms={checklistTerms}
        onCourseInfo={(termId, code) => {
          const term = filteredTerms.find((t) => t.id === termId);
          const matched = term?.slots.find((s) => s.code === code);
          if (matched && term) {
            setSelectedSlot(toCourseInfoSlotRecord(matched, term));
          }
        }}
      />

      <CourseInfoDialog
        open={selectedSlot !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedSlot(null);
        }}
        slot={selectedSlot}
      />

      <ReportPdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        report={reportPayload}
        filename="SAAIS-curriculum-checklist.pdf"
        onPrint={onPrintReport}
      />
    </div>
  );
}

interface ChecklistMetaData {
  readonly summary: ApiSchema<"AcademicSummary">;
  readonly studentName: string | null;
  readonly studentNumber: string | null;
  readonly programLabel: string | null;
  readonly curriculumLabel: string | null;
  readonly adviserName: string | null;
  readonly department: Partial<ApiSchema<"Department">> | null;
  readonly faculty: Partial<ApiSchema<"Faculty">> | null;
  readonly curriculumVersionId: string | null;
  readonly currTerms: readonly ApiSchema<"CurriculumTerm">[];
  readonly currSlots: readonly ApiSchema<"CurriculumTermCourse">[];
  readonly courses: readonly ApiSchema<"Course">[];
}

async function fetchChecklistMeta(
  studentId: string,
): Promise<ChecklistMetaData> {
  const summaryRes = await apiClient.GET(
    "/functions/v1/students/{student_id}/academic-summary",
    {
      params: { path: { student_id: studentId } },
    },
  );

  const summary = unwrapApiResult(summaryRes);

  const [
    profiles,
    orgs,
    programs,
    curricula,
    currTerms,
    currSlots,
    courses,
    assignments,
    departments,
    faculties,
  ] = await Promise.all([
    apiClient
      .GET("/rest/v1/profile", {
        params: { query: { id: postgrestFilter.eq(studentId) } },
      })
      .then(unwrapApiResult),
    apiClient
      .GET("/rest/v1/student_organization", {
        params: { query: { student_id: postgrestFilter.eq(studentId) } },
      })
      .then(unwrapApiResult),
    apiClient.GET("/rest/v1/program").then(unwrapApiResult),
    apiClient.GET("/rest/v1/curriculum_version").then(unwrapApiResult),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_term", {
          params: { query: { order: "id.asc", limit, offset } },
        }),
      (row) => row.id,
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_term_course", {
          params: { query: { order: "id.asc", limit, offset } },
        }),
      (row) => row.id,
    ),
    apiClient.GET("/rest/v1/course").then(unwrapApiResult),
    apiClient
      .GET("/rest/v1/adviser_assignment", {
        params: {
          query: {
            student_id: postgrestFilter.eq(studentId),
            select: "id,adviser_id,adviser_name,start_date,end_date",
            order: "start_date.desc",
          },
        },
      })
      .then(unwrapApiResult),
    apiClient.GET("/rest/v1/department").then(unwrapApiResult),
    apiClient.GET("/rest/v1/faculty").then(unwrapApiResult),
  ]);

  const profile = profiles[0] ?? null;
  const org = orgs[0] ?? null;

  const program = programs.find((p) => p.id === org?.program_id) ?? null;
  const curriculum =
    curricula.find((c) => c.id === org?.curriculum_version_id) ?? null;
  const department =
    departments.find((d) => d.id === org?.department_id) ?? null;
  const faculty = faculties.find((f) => f.id === org?.faculty_id) ?? null;
  const activeAssignment =
    assignments.find((a) => a.end_date == null) ?? assignments[0] ?? null;

  return {
    summary,
    studentName: profile?.full_name ?? null,
    studentNumber: profile?.student_number ?? null,
    programLabel: program?.name ?? null,
    curriculumLabel: curriculum?.version_label ?? null,
    adviserName: activeAssignment?.adviser_name ?? null,
    department,
    faculty,
    curriculumVersionId: org?.curriculum_version_id ?? null,
    currTerms,
    currSlots,
    courses,
  };
}

function isLapsedIncAttempt(
  attempt: ReturnType<typeof pickSourceAttempt>,
): boolean {
  return (
    attempt?.recorded_status === "inc" &&
    attempt.effective_status === "failed" &&
    attempt.completion_grade == null
  );
}

function buildChecklistTermSections(
  slotResults: readonly ApiSchema<"ChecklistSlotResult">[],
  meta: ChecklistMetaData,
): ChecklistTermSection[] {
  const courseMap = new Map(meta.courses.map((c) => [c.id, c]));
  const slotDefMap = new Map(meta.currSlots.map((s) => [s.id, s]));

  const scopedTerms = meta.curriculumVersionId
    ? meta.currTerms.filter(
        (t) => t.curriculum_version_id === meta.curriculumVersionId,
      )
    : meta.currTerms;

  const sortedTerms = [...scopedTerms].sort(
    (a, b) => a.year_level - b.year_level || a.term_sequence - b.term_sequence,
  );

  const slotsByTermId = new Map<string, ChecklistSlotDisplayItem[]>();
  const ungroupedSlots: ChecklistSlotDisplayItem[] = [];

  for (const result of slotResults) {
    const slotDef = slotDefMap.get(result.curriculum_term_course_id);
    const course = slotDef?.course_id
      ? courseMap.get(slotDef.course_id)
      : undefined;
    const code =
      course?.code ??
      slotDef?.slot_label ??
      result.credited_course_code ??
      "Requirement";
    const title =
      course?.title ??
      (slotDef?.is_elective_slot
        ? "Elective requirement"
        : (result.credited_course_title ?? "Curriculum course"));

    const displayItem: ChecklistSlotDisplayItem = {
      ...result,
      code,
      title,
      slotType: slotDef?.slot_type,
      isLapsedInc: isLapsedIncAttempt(pickSourceAttempt(result)),
    };

    if (slotDef?.curriculum_term_id) {
      const list = slotsByTermId.get(slotDef.curriculum_term_id) ?? [];
      list.push(displayItem);
      slotsByTermId.set(slotDef.curriculum_term_id, list);
    } else {
      ungroupedSlots.push(displayItem);
    }
  }

  const termSections: ChecklistTermSection[] = sortedTerms
    .map((term) => ({
      id: term.id,
      yearLevel: term.year_level,
      termSequence: term.term_sequence,
      title: `Year ${term.year_level} · ${formatTermSequenceLabel(
        term.term_sequence,
      )}`,
      slots: slotsByTermId.get(term.id) ?? [],
    }))
    .filter((section) => section.slots.length > 0);

  if (ungroupedSlots.length > 0) {
    termSections.push({
      id: "other-requirements",
      yearLevel: 99,
      termSequence: 1,
      title: "Additional requirements",
      slots: ungroupedSlots,
    });
  }

  return termSections;
}

/**
 * Student Curriculum Checklist page container handling loading, error/retry, and data hydration.
 */
export function StudentChecklistPage({ studentId }: { studentId: string }) {
  const checklistQuery = useStudentChecklist(studentId);
  const exportMutation = useRecordChecklistExport(studentId);
  const metaQuery = useQuery({
    queryKey: ["student", studentId, "checklist-meta"],
    queryFn: () => fetchChecklistMeta(studentId),
    enabled: Boolean(studentId),
  });

  const terms = React.useMemo(() => {
    if (!checklistQuery.data || !metaQuery.data) return [];
    return buildChecklistTermSections(checklistQuery.data, metaQuery.data);
  }, [checklistQuery.data, metaQuery.data]);

  if (
    !(checklistQuery.isPending || metaQuery.isPending) &&
    (checklistQuery.isError ||
      metaQuery.isError ||
      !checklistQuery.data ||
      !metaQuery.data)
  ) {
    return (
      <Panel
        title="Unable to load checklist"
        description="We could not load your curriculum checklist right now."
      >
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void Promise.all([checklistQuery.refetch(), metaQuery.refetch()])
          }
        >
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <AccountSkeleton
      id="student-checklist"
      data={
        checklistQuery.isPending || metaQuery.isPending ? null : metaQuery.data
      }
      label="Loading..."
    >
      {(meta) => (
        <StudentChecklistView
          summary={meta.summary}
          terms={terms}
          studentName={meta.studentName}
          studentNumber={meta.studentNumber}
          programLabel={meta.programLabel}
          curriculumLabel={meta.curriculumLabel}
          adviserName={meta.adviserName}
          department={meta.department}
          faculty={meta.faculty}
          onPrintReport={() => {
            void exportMutation.mutateAsync(undefined).catch(() => undefined);
          }}
        />
      )}
    </AccountSkeleton>
  );
}

export default StudentChecklistPage;
