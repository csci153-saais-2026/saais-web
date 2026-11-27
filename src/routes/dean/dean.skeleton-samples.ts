import { sampleRows } from "@/components/features/skeleton-sample";
import type { MappedDeanAuditEntry } from "./audit-log/use-dean-audit-log";
import type { DeanStudentSummary, FacultyDepartmentReport } from "./types";

/** Layout-only rows so the dean skeletons can be measured on first visit. */
export const DEAN_STUDENTS_SKELETON_SAMPLE: DeanStudentSummary[] = sampleRows(
  8,
  (i) => ({
    studentId: `sample-${i}`,
    studentNumber: "2021-00000",
    name: "Sample Student Name",
    initials: "SS",
    departmentId: "department",
    department: "Department of Sample Studies",
    curriculum: "BSCS 2024",
    adviser: "Sample Adviser Name",
    hasAdviser: true,
    program: "BSCS",
    yearLabel: "3rd year",
    email: "student@example.edu",
    standing: "good",
    gwa: "1.75",
    unitsEarned: 90,
    unitsRequired: 150,
    entryYear: 2021,
  }),
);

export const DEAN_AUDIT_SKELETON_SAMPLE: MappedDeanAuditEntry[] = sampleRows(
  10,
  (i) => ({
    id: `sample-${i}`,
    timestamp: "Jan 1, 2026 · 8:00 AM",
    actor: "Sample Person",
    action: "View",
    student: "Sample Student Name",
    details: "Viewed the student's grades",
    dayKey: "2026-01-01",
  }),
);

export const DEAN_REPORT_SKELETON_SAMPLE: FacultyDepartmentReport = {
  department: "All departments",
  departmentSummaryLabel: "Across all faculty departments",
  students: 120,
  meanGwa: "1.75",
  withDeficiencies: 12,
  bands: sampleRows(4, (i) => ({
    label: "1.00–1.50",
    percent: 40 - i * 8,
    detail: "100 grades",
    tone: "primary" as const,
  })),
  batchRows: sampleRows(6, (i) => ({
    batch: String(2021 + (i % 4)),
    curriculum: "BSCS 2024",
    students: 30,
    meanGwa: "1.75",
  })),
  cohortSamples: {},
};
