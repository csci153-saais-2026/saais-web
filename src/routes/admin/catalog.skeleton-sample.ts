import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { ApiSchema } from "@/lib/api";

/** Layout-only catalog rows so the admin tables can be measured on first visit. */
export const FACULTIES_SKELETON_SAMPLE = sampleRows(5, (i) =>
  layoutSample<ApiSchema<"Faculty">>({
    id: `faculty-${i}`,
    name: "Faculty of Sample Sciences",
    code: "FSS",
  }),
);

export const DEPARTMENTS_SKELETON_SAMPLE = sampleRows(6, (i) =>
  layoutSample<ApiSchema<"Department">>({
    id: `department-${i}`,
    name: "Department of Sample Studies",
    code: "DSS",
    faculty_id: "faculty-0",
  }),
);

export const PROGRAMS_SKELETON_SAMPLE = sampleRows(8, (i) =>
  layoutSample<ApiSchema<"Program">>({
    id: `program-${i}`,
    code: "BSCS",
    name: "Bachelor of Science in Sample Program",
    nominal_duration: 4,
    department_id: "department-0",
    status: "active",
  }),
);
