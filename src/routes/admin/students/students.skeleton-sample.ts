import { layoutSample, sampleRows } from "@/components/features/skeleton-sample";
import type { ApiSchema } from "@/lib/api";

/** Layout-only roster so the admin students table can be measured on first visit. */
export const ADMIN_STUDENTS_SKELETON_SAMPLE = {
  items: sampleRows(10, (i) =>
    layoutSample<ApiSchema<"StudentRosterItem">>({
      student_id: `sample-${i}`,
      student_number: "2021-00000",
      full_name: "Sample Student Name",
      program_code: "BSCS",
      curriculum_label: "BSCS 2024",
      entry_year: 2021,
      year_level: 3,
      gwa: 1.75,
      open_flags_count: 0,
      open_inc_count: 0,
      deficiencies_count: 0,
    }),
  ),
  total_count: 10,
};
