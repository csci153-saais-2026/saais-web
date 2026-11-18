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
      title="GWA by batch and curriculum"
      description="Entry year and academic performance across the selected scope."
      rows={rows}
      rowKey={(row) => `${row.batch}-${row.curriculum}`}
      empty="No cohort records available for this department."
      columns={[
        {
          header: "Batch",
          cell: (row) => row.batch,
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
          header: "Actions",
          cell: (row) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectBatch(row)}
            >
              View students <span aria-hidden="true">→</span>
              <span className="sr-only">
                {" "}
                for {row.batch} {row.curriculum}
              </span>
            </Button>
          ),
        },
      ]}
    />
  )
}
