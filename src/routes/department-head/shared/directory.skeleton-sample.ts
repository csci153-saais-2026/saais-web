import { sampleRows } from "@/components/features/skeleton-sample";
import type { DirectoryStudent } from "./students-types";

/** Layout-only rows so the directory skeletons can be measured on first visit. */
export const DIRECTORY_SKELETON_SAMPLE: DirectoryStudent[] = sampleRows(
  8,
  (i) => ({
    id: `sample-${i}`,
    name: "Sample Student Name",
    studentNumber: "2021-00000",
    email: "student@example.edu",
    curriculum: "BSCS 2024",
    yearStanding: "3rd year",
    adviser: "Sample Adviser Name",
  }),
);
