import type { StudentEnrollmentHistoryData } from "./student-enrollment-history.api";

/**
 * Layout-only stand-in for the enrollment history, used by the loading
 * skeleton so skullet can measure the table before real data arrives. It is
 * never rendered as content and never leaves the skeleton.
 */
export const ENROLLMENT_HISTORY_SKELETON_SAMPLE: StudentEnrollmentHistoryData =
  {
    attempts: Array.from({ length: 6 }, (_, i) => ({
      id: `sample-${i}`,
      student_id: "sample",
      course_offering_id: `offering-${i}`,
      recorded_status: "passed" as const,
      midterm_grade: 1.5,
      final_grade: 1.5,
      units_attempted: 3,
      revision: 1,
      completion_grade: null,
      effective_status: "passed" as const,
      gwa_grade: 1.5,
      is_lapsed_inc: false,
      is_repeated: false,
      counts_toward_cumulative_gwa: true,
    })),
    offeringDetails: Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => [
        `offering-${i}`,
        {
          code: "CSCI 000",
          title: "Sample course title",
          termLabel: "2025-2026 · 1st Semester",
        },
      ]),
    ),
    slotLabels: {},
  };
