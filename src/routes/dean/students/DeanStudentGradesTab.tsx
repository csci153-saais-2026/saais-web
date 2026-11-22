import { DataTablePanel } from "@/components/features/data-table-panel";
import { StatusBadge, type Status } from "@/components/ui/status-badge";
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

  const rows = gradesQuery.data.termGrades.flatMap((term) => {
    const termLabel = `${term.term_type} AY ${term.school_year}`;
    return term.attempts.map((attempt) => {
      const offering = offeringById.get(attempt.course_offering_id);
      const course = offering ? courseById.get(offering.course_id) : undefined;
      const grade = attempt.completion_grade ?? attempt.final_grade;
      return {
        id: attempt.id,
        term: termLabel,
        code: course?.code ?? "Course",
        title: course?.title ?? "Enrolled course",
        units: attempt.units_attempted,
        finalGrade: grade != null ? grade.toFixed(2) : "—",
        status: attempt.is_lapsed_inc
          ? ("inc-lapsed" as const)
          : GRADE_STATUS_MAP[attempt.effective_status],
      };
    });
  });

  return (
    <DataTablePanel
      title="Grades by term"
      description={`${rows.length} ${rows.length === 1 ? "record" : "records"}`}
      rows={rows}
      rowKey={(row) => row.id}
      empty="No grade records available for this student."
      columns={[
        {
          header: "Term",
          cell: (row) => (
            <span className="text-muted-foreground">{row.term}</span>
          ),
        },
        {
          header: "Course",
          cell: (row) => (
            <div>
              <span className="font-mono text-xs font-medium text-primary">
                {row.code}
              </span>
              <span className="ml-2">{row.title}</span>
            </div>
          ),
        },
        {
          header: "Units",
          numeric: true,
          cell: (row) => row.units,
        },
        {
          header: "Final grade",
          numeric: true,
          cell: (row) => (
            <span className="font-semibold">{row.finalGrade}</span>
          ),
        },
        {
          header: "Status",
          cell: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
