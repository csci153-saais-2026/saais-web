import { DataTablePanel } from "@/components/features/data-table-panel"
import { StatusBadge } from "@/components/ui/status-badge"
import type { DeanStudentDetail } from "@/routes/dean/types"

export function DeanStudentGradesTab({ student }: { student: DeanStudentDetail }) {
  return (
    <DataTablePanel
      title="Grades by term"
      description="Read-only transcript summary. Grade edits are restricted to assigned advisers."
      rows={student.gradeRows}
      rowKey={(row) => `${row.term}-${row.code}`}
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
              {row.remarks && (
                <div className="text-xs text-muted-foreground">{row.remarks}</div>
              )}
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

