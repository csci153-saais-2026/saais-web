import { layoutSample, sampleRows } from "@/components/features/skeleton-sample";
import type { GradesPageData } from "./StudentGradesPage";

/** Layout-only stand-in so the grades skeleton can be measured on first visit. */
export const GRADES_SKELETON_SAMPLE = layoutSample<GradesPageData>({
  terms: sampleRows(3, (t) => ({
    school_term_id: `t${t}`,
    school_year: "2025-2026",
    term_type: "1st Semester",
    chronological_key: 3 - t,
    gwa: 1.75,
    is_locked: false,
    failed_units: 0,
    attempts: sampleRows(6, (i) => ({
      id: `a${t}-${i}`,
      student_id: "sample",
      course_offering_id: `o${t}-${i}`,
      code: "CSCI 000",
      title: "Sample course title",
      recorded_status: "passed",
      effective_status: "passed",
      midterm_grade: 1.5,
      final_grade: 1.5,
      completion_grade: null,
      gwa_grade: 1.5,
      units_attempted: 3,
      revision: 1,
      is_lapsed_inc: false,
      is_repeated: false,
      counts_toward_cumulative_gwa: true,
    })),
  })),
  flags: [],
  courseDetails: {},
  studentName: "Sample Student Name",
  studentNumber: "2021-00000",
  programLabel: "Bachelor of Science in Sample Program",
  curriculumLabel: "2024 Curriculum",
  adviserName: "Sample Adviser Name",
  department: null,
  faculty: null,
});
