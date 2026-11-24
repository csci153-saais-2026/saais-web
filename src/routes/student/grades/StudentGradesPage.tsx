import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { notify } from "@/lib/notify";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertIcon } from "@/components/icons";
import {
  GradesView,
  type GradeRow,
  type GradesViewTerm,
} from "@/components/features/grades-view";
import { PageHeading } from "@/components/features/page-heading";
import { Panel } from "@/components/features/panel";
import {
  ReportPdfPreviewDialog,
  type ReportAuditEventType,
} from "@/components/features/report-pdf-preview-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Status } from "@/components/ui/status-badge";
import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import {
  formatGradeSummaryReport,
  type PdfReportPayload,
} from "@/lib/pdf/student-report-formatter";
import { cn } from "@/lib/utils";
import {
  useCreateGradeFlag,
  useRecordGradesExport,
  useStudentGradeFlags,
  useStudentGrades,
} from "./use-student-grades";
import { FlagGradeDialog, type FlagGradeTarget } from "./FlagGradeDialog";
import {
  GradeFlagsListDialog,
  type GradeFlagAttemptMeta,
  type GradeFlagDisplayItem,
} from "./GradeFlagsListDialog";

export type TermGradesAttemptRow = ApiSchema<"AttemptResult"> & {
  readonly code?: string | null;
  readonly title?: string | null;
};

export type TermGradesSection = Omit<ApiSchema<"TermGrades">, "attempts"> & {
  readonly attempts: readonly TermGradesAttemptRow[];
  readonly is_locked?: boolean;
  readonly failed_units?: number;
};

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatDeadlineDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—";
  const trimmed = dateValue.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const monthIndex = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const monthLabel = SHORT_MONTHS[monthIndex];
    if (monthLabel && day >= 1 && day <= 31) {
      return `${day} ${monthLabel} ${year}`;
    }
  }
  return trimmed;
}

function mapAttemptStatusToBadge(attempt: TermGradesAttemptRow): Status {
  if (attempt.is_lapsed_inc) return "inc-lapsed";
  switch (attempt.effective_status) {
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
    default:
      return "na";
  }
}

function formatMidtermGrade(attempt: TermGradesAttemptRow): string {
  if (attempt.midterm_status === "dr") return "DR";
  if (attempt.midterm_grade != null) return attempt.midterm_grade.toFixed(2);
  return "—";
}

function formatFinalOrCompletionGrade(attempt: TermGradesAttemptRow): string {
  if (attempt.completion_grade != null) {
    return `${attempt.completion_grade.toFixed(2)} (INC)`;
  }
  if (attempt.is_lapsed_inc) {
    return "INC (5.00)";
  }
  if (attempt.recorded_status === "inc") return "INC";
  if (attempt.recorded_status === "dr") return "DR";
  if (attempt.recorded_status === "na") return "NA";
  if (attempt.final_grade != null) return attempt.final_grade.toFixed(2);
  return "—";
}

function computeFailedUnits(attempts: readonly TermGradesAttemptRow[]): number {
  let failed = 0;
  for (const attempt of attempts) {
    if (attempt.effective_status === "failed") {
      failed += attempt.units_attempted;
    }
  }
  return failed;
}

export interface StudentGradesViewProps {
  readonly terms: readonly TermGradesSection[];
  readonly flags?: readonly GradeFlagDisplayItem[];
  readonly courseDetails?: Readonly<
    Record<
      string,
      {
        readonly code: string;
        readonly title?: string | null;
      }
    >
  >;
  readonly studentName?: string | null;
  readonly studentNumber?: string | null;
  readonly programLabel?: string | null;
  readonly curriculumLabel?: string | null;
  readonly adviserName?: string | null;
  readonly department?: Partial<ApiSchema<"Department">> | null;
  readonly faculty?: Partial<ApiSchema<"Faculty">> | null;
  readonly onCreateFlag?: (
    payload: ApiSchema<"GradeFlagCreateRequest">,
  ) => Promise<void> | void;
  readonly isSubmittingFlag?: boolean;
  readonly flagSubmitError?: string | null;
  readonly onPrintReport?: (eventType: ReportAuditEventType) => void;
}

/**
 * Pure Student Grades view accepting typed `ApiSchema` payloads.
 */
export function StudentGradesView({
  terms,
  flags = [],
  courseDetails,
  studentName,
  studentNumber,
  programLabel,
  curriculumLabel,
  adviserName,
  department,
  faculty,
  onCreateFlag,
  isSubmittingFlag = false,
  flagSubmitError = null,
  onPrintReport,
}: StudentGradesViewProps) {
  const [flagTarget, setFlagTarget] = React.useState<FlagGradeTarget | null>(
    null,
  );
  const [flagsListOpen, setFlagsListOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const sortedTerms = React.useMemo(() => {
    return [...terms].sort((a, b) => b.chronological_key - a.chronological_key);
  }, [terms]);

  const openFlagAttemptIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const flag of flags) {
      if (flag.status === "open") {
        ids.add(flag.attempt_id);
      }
    }
    return ids;
  }, [flags]);

  const attemptMeta = React.useMemo(() => {
    const map: Record<string, GradeFlagAttemptMeta> = {};
    for (const term of sortedTerms) {
      const termLabel = `${term.school_year} · ${term.term_type}`;
      for (const attempt of term.attempts) {
        const lookup = courseDetails?.[attempt.course_offering_id];
        map[attempt.id] = {
          code:
            attempt.code?.trim() ||
            lookup?.code?.trim() ||
            attempt.course_offering_id,
          title: attempt.title?.trim() || lookup?.title?.trim() || null,
          termLabel,
        };
      }
    }
    return map;
  }, [sortedTerms, courseDetails]);

  const { gradesViewTerms, flagTargetsByAttemptId } = React.useMemo(() => {
    const targets = new Map<string, FlagGradeTarget>();
    const mappedTerms: GradesViewTerm[] = sortedTerms.map((term) => {
      const failedUnits =
        term.failed_units ?? computeFailedUnits(term.attempts);
      const rows: GradeRow[] = term.attempts.map((attempt) => {
        const lookup = courseDetails?.[attempt.course_offering_id];
        const code =
          attempt.code?.trim() ||
          lookup?.code?.trim() ||
          attempt.course_offering_id;
        const title = attempt.title?.trim() || lookup?.title?.trim() || "";
        const midterm = formatMidtermGrade(attempt);
        const final = formatFinalOrCompletionGrade(attempt);
        const recordedGrade =
          final !== "—"
            ? final
            : midterm !== "—"
              ? `mid ${midterm}`
              : "No grade yet";
        const reportedStage: "midterm" | "final" =
          final === "—" && midterm !== "—" ? "midterm" : "final";

        targets.set(attempt.id, {
          attemptId: attempt.id,
          code,
          title,
          recordedGrade,
          reportedStage,
        });

        const notes: string[] = [];
        if (
          attempt.effective_status === "inc" &&
          !attempt.is_lapsed_inc &&
          attempt.inc_deadline
        ) {
          notes.push(`Due ${formatDeadlineDate(attempt.inc_deadline)}`);
        }
        if (attempt.is_repeated) {
          notes.push("Repeated");
        }

        return {
          id: attempt.id,
          code,
          title: title || undefined,
          units: attempt.units_attempted,
          midterm,
          final,
          status: mapAttemptStatusToBadge(attempt),
          statusNote: notes.length > 0 ? notes.join(" · ") : undefined,
        };
      });

      return {
        id: term.school_term_id,
        title: `${term.school_year} · ${term.term_type}`,
        gwa: term.gwa === null ? null : term.gwa.toFixed(2),
        failedUnits,
        locked: term.is_locked ?? false,
        rows,
      };
    });

    return { gradesViewTerms: mappedTerms, flagTargetsByAttemptId: targets };
  }, [sortedTerms, courseDetails]);

  const reportPayload = React.useMemo<PdfReportPayload>(() => {
    return formatGradeSummaryReport({
      studentName,
      studentNumber,
      programLabel,
      curriculumLabel,
      adviserName,
      department,
      faculty,
      terms: sortedTerms.map((term) => ({
        school_year: term.school_year,
        term_type: term.term_type,
        gwa: term.gwa,
        attempts: term.attempts.map((attempt) => {
          const lookup = courseDetails?.[attempt.course_offering_id];
          return {
            ...attempt,
            code: attempt.code ?? lookup?.code ?? null,
            title: attempt.title ?? lookup?.title ?? null,
          };
        }),
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
    sortedTerms,
    courseDetails,
  ]);

  async function handleFlagSubmit(
    payload: ApiSchema<"GradeFlagCreateRequest">,
  ) {
    await onCreateFlag?.(payload);
    notify.success("Grade flag submitted.");
    setFlagTarget(null);
  }

  return (
    <div>
      <PageHeading
        title="Grades"
        subtitle="Every term, newest first. Flag any grade that needs review."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              disabled={sortedTerms.length === 0}
              className="min-h-11 md:min-h-[38px]"
            >
              Download Grade Summary
            </Button>
            <Button
              type="button"
              onClick={() => setFlagsListOpen(true)}
              className="min-h-11 md:min-h-[38px]"
            >
              View Grade Flags
            </Button>
          </>
        }
      />

      <GradesView
        terms={gradesViewTerms}
        rowAction={{
          header: "Flag",
          render: (row) => {
            const isFlagged = openFlagAttemptIds.has(row.id);
            return (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={isFlagged}
                className={cn(
                  "min-h-11 md:min-h-[38px]",
                  isFlagged &&
                    "border-notice-advisory-border bg-notice-advisory-bg text-notice-advisory hover:bg-notice-advisory-bg",
                )}
                onClick={() => {
                  if (isFlagged) {
                    setFlagsListOpen(true);
                    return;
                  }
                  const target = flagTargetsByAttemptId.get(row.id);
                  if (target) {
                    setFlagTarget(target);
                  }
                }}
              >
                {isFlagged ? "Flagged" : "Flag Grade"}
              </Button>
            );
          },
        }}
        footnote={
          <Alert variant="advisory" className="mt-5">
            <AlertIcon />
            <AlertDescription>
              Once passed, the most recent passing attempt counts for
              non-repeatable and grade-replacement courses. Additional-credit
              passes count independently. Lapsed INC remains INC and counts as{" "}
              <span className="font-mono">5.00</span> for GWA and failed units.
            </AlertDescription>
          </Alert>
        }
      />

      <FlagGradeDialog
        open={flagTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setFlagTarget(null);
        }}
        target={flagTarget}
        onSubmit={handleFlagSubmit}
        isSubmitting={isSubmittingFlag}
        submitError={flagSubmitError}
      />

      <GradeFlagsListDialog
        open={flagsListOpen}
        onOpenChange={setFlagsListOpen}
        flags={flags}
        attemptMeta={attemptMeta}
      />

      <ReportPdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        report={reportPayload}
        filename="SAAIS-grade-summary.pdf"
        onPrint={onPrintReport}
      />
    </div>
  );
}

interface GradesPageData {
  readonly terms: readonly TermGradesSection[];
  readonly flags: readonly GradeFlagDisplayItem[];
  readonly courseDetails: Readonly<
    Record<string, { readonly code: string; readonly title?: string | null }>
  >;
  readonly studentName: string | null;
  readonly studentNumber: string | null;
  readonly programLabel: string | null;
  readonly curriculumLabel: string | null;
  readonly adviserName: string | null;
  readonly department: Partial<ApiSchema<"Department">> | null;
  readonly faculty: Partial<ApiSchema<"Faculty">> | null;
}

interface GradesMetadata {
  readonly schoolTerms: readonly ApiSchema<"SchoolTerm">[];
  readonly offerings: readonly ApiSchema<"CourseOffering">[];
  readonly courses: readonly ApiSchema<"Course">[];
  readonly profile: ApiSchema<"Profile"> | null;
  readonly org: ApiSchema<"StudentOrganization"> | null;
  readonly programs: readonly ApiSchema<"Program">[];
  readonly curricula: readonly ApiSchema<"CurriculumVersion">[];
  readonly assignments: readonly Pick<
    ApiSchema<"AdviserAssignment">,
    "id" | "adviser_id" | "adviser_name" | "start_date" | "end_date"
  >[];
  readonly departments: readonly ApiSchema<"Department">[];
  readonly faculties: readonly ApiSchema<"Faculty">[];
}

async function fetchStudentGradesMetadata(
  studentId: string,
): Promise<GradesMetadata> {
  const [
    schoolTerms,
    offerings,
    courses,
    profiles,
    orgs,
    programs,
    curricula,
    assignments,
    departments,
    faculties,
  ] = await Promise.all([
    apiClient.GET("/rest/v1/school_term").then(unwrapApiResult),
    apiClient.GET("/rest/v1/course_offering").then(unwrapApiResult),
    apiClient.GET("/rest/v1/course").then(unwrapApiResult),
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

  return {
    schoolTerms,
    offerings,
    courses,
    profile: profiles[0] ?? null,
    org: orgs[0] ?? null,
    programs,
    curricula,
    assignments,
    departments,
    faculties,
  };
}

function buildGradesPageData(
  rawTerms: readonly ApiSchema<"TermGrades">[],
  flags: readonly ApiSchema<"GradeFlag">[],
  metadata: GradesMetadata | null,
): GradesPageData {
  const schoolTerms = metadata?.schoolTerms ?? [];
  const offerings = metadata?.offerings ?? [];
  const courses = metadata?.courses ?? [];
  const profile = metadata?.profile ?? null;
  const org = metadata?.org ?? null;
  const programs = metadata?.programs ?? [];
  const curricula = metadata?.curricula ?? [];
  const assignments = metadata?.assignments ?? [];
  const departments = metadata?.departments ?? [];
  const faculties = metadata?.faculties ?? [];

  const termLockMap = new Map(schoolTerms.map((t) => [t.id, t.is_locked]));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const courseDetails: Record<
    string,
    { readonly code: string; readonly title?: string | null }
  > = {};
  for (const offering of offerings) {
    const course = courseMap.get(offering.course_id);
    if (course) {
      courseDetails[offering.id] = {
        code: course.code,
        title: course.title,
      };
    }
  }

  const terms: TermGradesSection[] = rawTerms.map((term) => ({
    ...term,
    is_locked: termLockMap.get(term.school_term_id) ?? false,
    attempts: term.attempts.map((attempt) => {
      const course = courseDetails[attempt.course_offering_id];
      return {
        ...attempt,
        code: course?.code ?? null,
        title: course?.title ?? null,
      };
    }),
  }));

  const program = programs.find((p) => p.id === org?.program_id) ?? null;
  const curriculum =
    curricula.find((c) => c.id === org?.curriculum_version_id) ?? null;
  const department =
    departments.find((d) => d.id === org?.department_id) ?? null;
  const faculty = faculties.find((f) => f.id === org?.faculty_id) ?? null;
  const activeAssignment =
    assignments.find((a) => a.end_date == null) ?? assignments[0] ?? null;

  return {
    terms,
    flags,
    courseDetails,
    studentName: profile?.full_name ?? null,
    studentNumber: profile?.student_number ?? null,
    programLabel: program?.name ?? null,
    curriculumLabel: curriculum?.version_label ?? null,
    adviserName: activeAssignment?.adviser_name ?? null,
    department,
    faculty,
  };
}

/**
 * Student Grades page container handling loading, error/retry, grade flag submission,
 * and grade summary PDF preview.
 */
export function StudentGradesPage({ studentId }: { studentId: string }) {
  const gradesQuery = useStudentGrades(studentId);
  const flagsQuery = useStudentGradeFlags(studentId);
  const metaQuery = useQuery({
    queryKey: ["student", studentId, "grades-meta"],
    queryFn: () => fetchStudentGradesMetadata(studentId),
    enabled: Boolean(studentId),
  });
  const createFlagMutation = useCreateGradeFlag(studentId);
  const recordExportMutation = useRecordGradesExport(studentId);

  const data = React.useMemo(() => {
    if (!gradesQuery.data) return null;
    return buildGradesPageData(
      gradesQuery.data,
      flagsQuery.data ?? [],
      metaQuery.data ?? null,
    );
  }, [gradesQuery.data, flagsQuery.data, metaQuery.data]);

  const isPending =
    gradesQuery.isPending || flagsQuery.isPending || metaQuery.isPending;
  const isError =
    gradesQuery.isError || flagsQuery.isError || metaQuery.isError;

  const refetch = React.useCallback(async () => {
    await Promise.all([
      gradesQuery.refetch(),
      flagsQuery.refetch(),
      metaQuery.refetch(),
    ]);
  }, [gradesQuery, flagsQuery, metaQuery]);

  async function handleCreateFlag(
    payload: ApiSchema<"GradeFlagCreateRequest">,
  ) {
    await createFlagMutation.mutateAsync(payload);
  }

  const flagSubmitError = createFlagMutation.error
    ? createFlagMutation.error instanceof Error
      ? createFlagMutation.error.message
      : "Could not submit your grade flag. Please try again."
    : null;

  if (!isPending && (isError || !data)) {
    return (
      <Panel
        title="Unable to load grades"
        description="We could not load your grade records right now."
      >
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <AccountSkeleton
      id="student-grades"
      data={isPending ? null : data}
      label="Loading..."
    >
      {(data) => (
        <StudentGradesView
          terms={data.terms}
          flags={data.flags}
          courseDetails={data.courseDetails}
          studentName={data.studentName}
          studentNumber={data.studentNumber}
          programLabel={data.programLabel}
          curriculumLabel={data.curriculumLabel}
          adviserName={data.adviserName}
          department={data.department}
          faculty={data.faculty}
          onCreateFlag={handleCreateFlag}
          isSubmittingFlag={createFlagMutation.isPending}
          flagSubmitError={flagSubmitError}
          onPrintReport={() => {
            recordExportMutation.mutate(undefined);
          }}
        />
      )}
    </AccountSkeleton>
  );
}

export default StudentGradesPage;
