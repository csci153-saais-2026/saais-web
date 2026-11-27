import {
  CohortGwaTable,
  type CohortGwaRow,
} from "@/components/features/cohort-gwa-table";
import type { BatchCurriculumRow } from "@/routes/dean/types";

function toCohortRowId(row: BatchCurriculumRow) {
  return `${row.batch}-${row.curriculum}`;
}

export function FacultyBatchGwaTable({
  rows,
  onSelectBatch,
}: {
  rows: BatchCurriculumRow[];
  onSelectBatch: (row: BatchCurriculumRow) => void;
}) {
  const rowsById = new Map(rows.map((row) => [toCohortRowId(row), row]));
  const mappedRows: CohortGwaRow[] = rows.map((row) => ({
    id: toCohortRowId(row),
    entryYear: row.batch,
    curriculum: row.curriculum,
    students: row.students,
    meanGwa: row.meanGwa,
  }));

  return (
    <CohortGwaTable
      rows={mappedRows}
      description="Entry year and academic performance across the selected scope."
      emptyMessage="No cohort records available for this department."
      onViewStudents={(mapped) => {
        const original = rowsById.get(mapped.id);
        if (original) onSelectBatch(original);
      }}
    />
  );
}
