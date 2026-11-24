import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { SchoolTerm } from "./academic-terms.api";

/** Layout-only term rows so the term history table can be measured on first visit. */
export const STAFF_TERMS_SKELETON_SAMPLE: SchoolTerm[] = sampleRows(5, (i) =>
  layoutSample<SchoolTerm>({
    id: `sample-${i}`,
    start_year: 2025,
    end_year: 2026,
    school_year: "2025–2026",
    term_type: "1st Semester",
    starts_on: "2025-08-04",
    ends_on: "2025-12-12",
    encoding_deadline: "2025-12-19",
    chronological_key: 10 - i,
    is_locked: i > 0,
  }),
);
