import {
  GradesView,
  type GradeRow,
  type GradesViewTerm,
} from "@/components/features/grades-view";
import type { Status } from "@/components/ui/status-badge";
import type { ApiSchema } from "@/lib/api";
import { DeanQueryState } from "@/routes/dean/shared/DeanQueryState";
import { useDeanStudentGrades } from "@/routes/dean/students/use-dean-students";
import type { DeanStudentSummary } from "@/routes/dean/types";

const GRADE_STATUS_MAP: Record<
  ApiSchema<"AttemptResult">["effective_status"],
  Status
> = {
  passed: "passed",
  failed: "failed",
  inc: "inc",
  currently_enrolled: "enrolled",
  dr: "dr",
  na: "na",
};

function formatMidtermGrade(attempt: ApiSchema<"AttemptResult">): string {
  if (attempt.midterm_status === "dr") return "DR";
  if (attempt.midterm_grade != null) return attempt.midterm_grade.toFixed(2);
  return "—";
}

function formatFinalGrade(attempt: ApiSchema<"AttemptResult">): string {
  if (attempt.recorded_status === "inc") {
    return attempt.completion_grade != null
      ? `${attempt.completion_grade.toFixed(2)} (INC)`
      : "INC";
  }
  if (attempt.recorded_status === "dr") return "DR";
  if (attempt.recorded_status === "na") return "NA";
  if (attempt.final_grade != null) return attempt.final_grade.toFixed(2);
  return "—";
}

export function DeanStudentGradesTab({
  student,
}: {
  student: DeanStudentSummary;
}) {
  const gradesQuery = useDeanStudentGrades(student.studentId);

  if (!gradesQuery.data) {
    return (
      <DeanQueryState
        isLoading={gradesQuery.isLoading}
        isError={gradesQuery.isError}
        label="student grades"
        onRetry={() => void gradesQuery.refetch()}
      />
    );
  }

  const courseById = new Map(gradesQuery.data.courses.map((c) => [c.id, c]));
  const offeringById = new Map(
    gradesQuery.data.offerings.map((o) => [o.id, o]),
  );

  const terms: GradesViewTerm[] = gradesQuery.data.termGrades.map((term) => {
    const failedUnits = term.attempts.reduce(
      (sum, attempt) =>
        attempt.effective_status === "failed" || attempt.is_lapsed_inc
          ? sum + attempt.units_attempted
          : sum,
      0,
    );

    const rows: GradeRow[] = term.attempts.map((attempt) => {
      const offering = offeringById.get(attempt.course_offering_id);
      const course = offering ? courseById.get(offering.course_id) : undefined;
      return {
        id: attempt.id,
        code: course?.code ?? "Course",
        title: course?.title ?? "Enrolled course",
        units: attempt.units_attempted,
        midterm: formatMidtermGrade(attempt),
        final: formatFinalGrade(attempt),
        status: attempt.is_lapsed_inc
          ? "inc-lapsed"
          : GRADE_STATUS_MAP[attempt.effective_status],
        statusNote: attempt.is_repeated ? "Repeated" : undefined,
      };
    });

    return {
      id: term.school_term_id,
      title: `${term.school_year} · ${term.term_type}`,
      gwa: term.gwa != null ? term.gwa.toFixed(2) : null,
      failedUnits,
      rows,
    };
  });

  return (
    <GradesView
      terms={terms}
      emptyMessage="No grade records available for this student."
    />
  );
}
