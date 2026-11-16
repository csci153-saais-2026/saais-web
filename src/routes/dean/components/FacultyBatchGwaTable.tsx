import { DataTablePanel } from "@/components/features/data-table-panel"
import { Button } from "@/components/ui/button"
import type { BatchCurriculumRow } from "@/routes/dean/types"

export function FacultyBatchGwaTable({
  rows,
  onSelectBatch,
}: {
  rows: BatchCurriculumRow[]
  onSelectBatch: (row: BatchCurriculumRow) => void
}) {
  return (
    <DataTablePanel
      title="GWA by batch and curriculum version"
      description="Select a cohort to inspect the underlying student list."
      rows={rows}
      rowKey={(row) => `${row.batch}-${row.curriculum}`}
      empty="No cohort records available for this department."
      columns={[
        {
          header: "Batch",
          cell: (row) => <span className="font-mono font-medium">{row.batch}</span>,
        },
        {
          header: "Curriculum",
          cell: (row) => row.curriculum,
        },
        {
          header: "Students",
          numeric: true,
          cell: (row) => row.students,
        },
        {
          header: "Mean GWA",
          numeric: true,
          cell: (row) => row.meanGwa,
        },
        {
          header: "",
          className: "text-right",
          cell: (row) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectBatch(row)}
            >
              View students
            </Button>
          ),
        },
      ]}
    />
  )
}

