import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { AcademicTermRecord } from "../academic-terms/terms-api";
import type { AuditEvent } from "../audit-log/audit-types";
import type { CurriculaData } from "../curricula/curricula-api";
import type {
  TransferDecisionHistory,
  TransferRequest,
} from "../curriculum-transfers/transfers-api";
import type {
  CourseEquivalence,
  CurriculumOption,
  EquivalenceCourse,
} from "../equivalence/equivalence-api";
import type {
  CreditStudentOption,
  DestinationSlot,
  OutsideCreditRecord,
} from "../outside-credits/outside-credits-api";
import type { ReportSource } from "../reports/reports-api";
import type { SettingsState } from "../settings/settings-types";

/**
 * Layout-only stand-ins so each department-head skeleton can be measured on
 * the first visit. They are never shown as content.
 */

export const TERMS_SKELETON_SAMPLE: AcademicTermRecord[] = sampleRows(
  5,
  (i) => ({
    id: `term-${i}`,
    academicYear: "2025–2026",
    semester: "1st Semester",
    termDates: "Aug 4, 2025 – Dec 12, 2025",
    encodingDeadline: "Dec 19, 2025",
    status: i === 0 ? "Open" : "Closed",
  }),
);

export const AUDIT_SKELETON_SAMPLE: AuditEvent[] = sampleRows(10, (i) => ({
  id: `event-${i}`,
  timestamp: "2026-01-01 08:00",
  person: "Sample Person",
  action: "View",
  studentName: "Sample Student Name",
  studentNumber: "2021-00000",
  record: "Student record",
  details: "Viewed the student's grades",
}));

export const CURRICULA_SKELETON_SAMPLE = layoutSample<CurriculaData>({
  versions: sampleRows(4, (i) => ({
    id: `v${i}`,
    programId: "p",
    departmentId: "d",
    prog: "BSCS",
    year: "2024-2025 v1",
    units: 150,
    enrolled: 120,
    from: "2024",
    status: i === 0 ? "active" : "retired",
    terms: [],
  })),
  programs: [{ id: "p", code: "BSCS" }],
  departments: [{ id: "d", name: "Department of Sample Studies" }],
  courses: [],
});

export const TRANSFERS_SKELETON_SAMPLE = {
  pending: sampleRows(4, (i): TransferRequest => ({
    id: `r${i}`,
    studentName: "Sample Student Name",
    studentId: "2021-00000",
    currentCurriculum: "BSCS 2022",
    requestedCurriculum: "BSCS 2024",
    adviser: "Sample Adviser Name",
    submittedDate: "Jan 1, 2026",
    reason: "Sample reason for the transfer request.",
  })),
  history: sampleRows(4, (i): TransferDecisionHistory => ({
    id: `h${i}`,
    studentName: "Sample Student Name",
    studentId: "2021-00000",
    currentCurriculum: "BSCS 2022",
    requestedCurriculum: "BSCS 2024",
    adviser: "Sample Adviser Name",
    decision: "Approved",
    decisionDate: "Jan 1, 2026",
    decisionReason: "Sample decision reason.",
  })),
};

const course = (i: number): EquivalenceCourse => ({
  id: `c${i}`,
  code: "CSCI 000",
  title: "Sample course title",
  units: 3,
});

export const EQUIVALENCE_SKELETON_SAMPLE = {
  curricula: sampleRows(2, (i): CurriculumOption => ({
    id: `cur${i}`,
    label: "BSCS 2024",
  })),
  courses: sampleRows(6, course),
  equivalencies: sampleRows(5, (i): CourseEquivalence => ({
    id: `e${i}`,
    fromCurriculumId: "cur0",
    toCurriculumId: "cur1",
    sourceCourse: course(i),
    targetCourse: course(i + 1),
  })),
};

export const OUTSIDE_CREDITS_SKELETON_SAMPLE = {
  records: sampleRows(5, (i): OutsideCreditRecord => ({
    id: `oc${i}`,
    studentUuid: "s",
    studentName: "Sample Student Name",
    studentId: "2021-00000",
    originalCode: "CSCI 000",
    originalTitle: "Sample course title",
    originalUnits: 3,
    originSchool: "Sample University",
    grade: "1.50",
    slotId: "slot",
    equivalentCode: "CSCI 000",
    equivalentTitle: "Sample course title",
    equivalentUnits: 3,
    targetCurriculum: "BSCS 2024",
    entryType: "Transferee",
    unitsCredited: 3,
  })),
  students: sampleRows(3, (i): CreditStudentOption => ({
    id: `s${i}`,
    name: "Sample Student Name",
    studentNumber: "2021-00000",
    curriculumId: "cur",
    curriculumLabel: "BSCS 2024",
  })),
  slots: sampleRows(3, (i): DestinationSlot => ({
    id: `d${i}`,
    code: "CSCI 000",
    title: "Sample course title",
    units: 3,
    curriculumId: "cur",
  })),
};

export const REPORTS_SKELETON_SAMPLE: ReportSource = {
  students: sampleRows(12, (i) => ({
    id: `s${i}`,
    name: "Sample Student Name",
    studentNumber: "2021-00000",
    programCode: "BSCS",
    programName: "Bachelor of Science in Sample Program",
    curriculum: "BSCS 2024",
    entryYear: 2021 + (i % 4),
    gwa: 1.75,
    deficiencies: 0,
  })),
  currentCurricula: new Set(["BSCS 2024"]),
  terms: [{ value: "term", label: "2025–2026 · 1st Semester" }],
  currentTermId: "term",
  programs: [{ value: "all", label: "All programs" }],
};

export const SETTINGS_SKELETON_SAMPLE: SettingsState = {
  thresholds: { warning: 30, probation: 40, dismissal: 50 },
  senderEmail: "sender@example.edu",
  latestBackup: {
    completedAt: "2026-01-01T00:00:00Z",
    reference: "BK-0000",
    location: "Sample location",
    scope: "department_records",
  },
};
