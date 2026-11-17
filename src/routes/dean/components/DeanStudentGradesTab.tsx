import { useQuery } from "@tanstack/react-query"
import { DataTablePanel } from "@/components/features/data-table-panel"
import { StatusBadge, type Status } from "@/components/ui/status-badge"
import type { ApiSchema } from "@/lib/api"
import { getDeanCourses, getDeanStudentGrades } from "@/routes/dean/api/dean.api"
import { DeanQueryState } from "@/routes/dean/components/DeanQueryState"
import type { DeanStudentSummary } from "@/routes/dean/types"

const GRADE_STATUS_MAP: Record<ApiSchema<"AttemptResult">["effective_status"], Status> = {
  passed: "passed",
  failed: "failed",
  inc: "inc",
  inc_lapsed: "inc-lapsed",
  currently_enrolled: "enrolled",
  dr: "dr",
  na: "na",
}

const TERM_TYPE_LABEL: Record<ApiSchema<"TermType">, string> = {
  "1st": "1st Sem",
  "2nd": "2nd Sem",
  midyear: "Midyear",
}

export function DeanStudentGradesTab({ student }: { student: DeanStudentSummary }) {
  const gradesQuery = useQuery({
    queryKey: ["dean", "student-grades", student.studentId],
    queryFn: async () => {
      const [termGrades, courses] = await Promise.all([
        getDeanStudentGrades(student.studentId),
        getDeanCourses(),
      ])
      return { termGrades, courses }
    },
  })

  if (!gradesQuery.data) {
    return (
      <DeanQueryState
        isLoading={gradesQuery.isLoading}
        isError={gradesQuery.isError}
        label="student grades"
        onRetry={() => void gradesQuery.refetch()}
      />
    )
  }

  const courseById = new Map(gradesQuery.data.courses.map((c) => [c.id, c]))
  const rows = gradesQuery.data.termGrades.flatMap((term) => {
    const termLabel = `${TERM_TYPE_LABEL[term.term_type]} AY ${term.school_year}`
    return term.attempts.map((attempt) => {
      const course = courseById.get(attempt.course_id)
      const grade = attempt.completion_grade ?? attempt.final_grade
      return {
        id: attempt.attempt_id,
        term: termLabel,
        code: course?.code ?? attempt.course_id,
        title: course?.title ?? "Course",
        units: attempt.units_attempted,
        finalGrade: grade != null ? grade.toFixed(2) : "—",
        status: GRADE_STATUS_MAP[attempt.effective_status],
      }
    })
  })

  return (
    <DataTablePanel
      title="Grades by term"
      description="Read-only transcript summary. Grade edits are restricted to assigned advisers."
      rows={rows}
      rowKey={(row) => row.id}
      empty="No grade records available for this student."
      columns={[
        {
          header: "Term",
          cell: (row) => <span className="text-muted-foreground">{row.term}</span>,
        },
        {
          header: "Course",
          cell: (row) => (
            <div>
              <span className="font-mono text-xs font-medium text-primary">{row.code}</span>
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
          cell: (row) => <span className="font-semibold">{row.finalGrade}</span>,
        },
        {
          header: "Status",
          cell: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  )
}
