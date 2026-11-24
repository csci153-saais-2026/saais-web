import { layoutSample, sampleRows } from "@/components/features/skeleton-sample";
import type { ApiSchema } from "@/lib/api";

type RosterItem = ApiSchema<"StudentRosterItem">;

/** Layout-only roster rows so the staff directory skeletons can be measured on first visit. */
export const ROSTER_SKELETON_SAMPLE: RosterItem[] = sampleRows(8, (i) =>
  layoutSample<RosterItem>({
    student_id: `sample-${i}`,
    student_number: "2021-00000",
    full_name: "Sample Student Name",
    email: "student@example.edu",
    status: "active",
    program_code: "BSCS",
    program_name: "Bachelor of Science in Sample Program",
    curriculum_label: "BSCS 2024",
    entry_year: 2021,
    year_level: 3,
    adviser_name: "Sample Adviser Name",
  }),
);

/** The adviser-assignments directory is the roster plus assignment history. */
export const ASSIGNMENTS_DIRECTORY_SKELETON_SAMPLE = {
  students: ROSTER_SKELETON_SAMPLE,
  history: [],
};
