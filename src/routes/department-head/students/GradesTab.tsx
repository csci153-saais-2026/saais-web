import { useQuery } from "@tanstack/react-query";
import {
  GradesView,
  type GradeRow,
  type GradesViewTerm,
} from "@/components/features/grades-view";
import type { Status } from "@/components/ui/status-badge";
import type { ApiSchema } from "@/lib/api";
import { getGrades } from "@/routes/adviser/advisees/checklist/record.api";
import { QueryMessage } from "../shared/dh-ui";
import type { DirectoryStudent } from "../shared/students-types";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";

const STATUS: Record<ApiSchema<"AttemptResult">["effective_status"], Status> = {
  na: "na",
  failed: "failed",
  passed: "passed",
  inc: "inc",
  dr: "dr",
  currently_enrolled: "enrolled",
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

export function GradesTab({ student }: { student: DirectoryStudent }) {
  const grades = useQuery({
    queryKey: [
      ...useDepartmentHeadQueryKey(["department-head", "grades"]),
      student.id,
    ],
    queryFn: () => getGrades(student.id),
  });
  if (!grades.data) return <QueryMessage query={grades} label="the grades" />;

  const courseById = new Map(grades.data.courses.map((c) => [c.id, c]));
  const offeringById = new Map(grades.data.offerings.map((o) => [o.id, o]));

  const terms: GradesViewTerm[] = grades.data.terms.map((term) => {
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
          : STATUS[attempt.effective_status],
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
      emptyMessage="No grades have been recorded for this student."
    />
  );
}
