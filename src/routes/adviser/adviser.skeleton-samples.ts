import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { ApiSchema } from "@/lib/api";
import type { getChecklist, getGrades } from "./advisees/checklist/record.api";
import type { getTermOfferings } from "./record-grades/encode.api";
import type { getSelectedStudent } from "./advisees/advisees.api";
import type { getFlags } from "./grade-flags/grade-flags.api";
import type { getAdviserDashboard } from "./dashboard/adviser-dashboard.api";
import type { getCurriculumData } from "./advisees/curriculum/curriculum.api";
import type { getStudentHistory } from "./advisees/history/history.api";
import type { getNotes } from "./advisees/notes/notes.api";

/** Layout-only stand-ins so the adviser skeletons can be measured on first visit. */
export const ADVISEES_SKELETON_SAMPLE = sampleRows(10, (i) =>
  layoutSample<ApiSchema<"StudentRosterItem"> & Record<string, unknown>>({
    student_id: `sample-${i}`,
    student_number: "2021-00000",
    full_name: "Sample Student Name",
    program_name: "Bachelor of Science in Sample Program",
    curriculum_label: "BSCS 2024",
    year_level: 3,
    gwa: 1.75,
    open_flags_count: 0,
    standing: "good_standing",
  }),
);

const SUMMARY = {
  student_id: "sample",
  gwa: 1.75,
  earned_units: 90,
  required_units: 150,
  counted_units: 90,
  failed_units: 0,
  in_progress_units: 18,
  remaining_units: 60,
  failure_pct: 0,
  standing: "good_standing",
  year_level: 3,
  slots_satisfied: 30,
  total_slots: 50,
  open_inc_count: 0,
  lapsed_inc_count: 0,
  open_flags_count: 0,
  deficiencies_count: 0,
  deficiencies: [],
  is_delinquent: false,
  computed_at: "2026-01-01T00:00:00Z",
};

export const NOTES_SKELETON_SAMPLE = layoutSample<{
  isCurrent: boolean;
  notes: Awaited<ReturnType<typeof getNotes>>["notes"];
}>({
  isCurrent: true,
  notes: sampleRows(4, (i) => ({
    id: `note-${i}`,
    student_id: "sample",
    authored_by: "adviser",
    author_name: "Sample Adviser",
    body_text: "Sample advising note text that spans a line or two.",
    is_archived: false,
    created_at: "2026-01-01T00:00:00Z",
  })),
});

export const HISTORY_SKELETON_SAMPLE = sampleRows(8, (i) =>
  layoutSample<Awaited<ReturnType<typeof getStudentHistory>>[number]>({
    id: `event-${i}`,
    actor_id: "actor",
    actor_name: "Sample Person",
    actor_role: "adviser",
    action: "viewed",
    details_summary: "Viewed the student's checklist",
    created_at: "2026-01-01T00:00:00Z",
  }),
);

export const CURRICULUM_SKELETON_SAMPLE = layoutSample<
  Awaited<ReturnType<typeof getCurriculumData>>
>({
  canEdit: true,
  versions: sampleRows(3, (i) => ({
    id: `v${i}`,
    version_label: "BSCS 2024",
    status: "active",
  })),
  assignments: sampleRows(2, (i) => ({
    id: `a${i}`,
    curriculum_version_id: "v0",
    start_date: "2021-08-01",
    end_date: i === 0 ? null : "2020-01-01",
    change_note: "Sample change note",
  })),
});

export const CHECKLIST_SKELETON_SAMPLE = layoutSample<
  Awaited<ReturnType<typeof getChecklist>>
>({
  summary: SUMMARY,
  terms: sampleRows(2, (t) => ({
    id: `term-${t}`,
    year_level: 1,
    term_sequence: 1 + t,
  })),
  slots: sampleRows(12, (i) => ({
    id: `slot-${i}`,
    curriculum_term_id: `term-${i % 2}`,
    course_id: `course-${i}`,
  })),
  courses: sampleRows(12, (i) => ({
    id: `course-${i}`,
    code: "CSCI 000",
    title: "Sample course title",
    units: 3,
    category: "major",
  })),
  results: sampleRows(12, (i) => ({
    curriculum_term_course_id: `slot-${i}`,
    status: "passed",
    required_units: 3,
    earned_units: 3,
    source_attempt_id: null,
    satisfaction_source: "Direct",
    attempts: [],
  })),
});

export const GRADES_SKELETON_SAMPLE = layoutSample<
  Awaited<ReturnType<typeof getGrades>>
>({
  canEdit: true,
  offerings: [],
  courses: [],
  schoolTerms: [],
  studentName: "Sample Student Name",
  terms: sampleRows(3, (t) => ({
    school_term_id: `t${t}`,
    school_year: "2025-2026",
    term_type: "1st Semester",
    chronological_key: 3 - t,
    gwa: 1.75,
    attempts: sampleRows(6, (i) => ({
      id: `a${t}-${i}`,
      student_id: "sample",
      course_offering_id: `o${t}-${i}`,
      recorded_status: "passed",
      effective_status: "passed",
      midterm_grade: 1.5,
      final_grade: 1.5,
      completion_grade: null,
      units_attempted: 3,
      is_lapsed_inc: false,
      is_repeated: false,
    })),
  })),
});

export const GRADE_FLAGS_SKELETON_SAMPLE = layoutSample<
  Awaited<ReturnType<typeof getFlags>>
>({
  flags: sampleRows(6, (i) => ({
    id: `flag-${i}`,
    student_id: "student",
    attempt_id: `attempt-${i}`,
    reported_grade_text: "1.50",
    details: "Sample flag comment from the student.",
    created_at: "2026-01-01T00:00:00Z",
  })),
  roster: [
    {
      student_id: "student",
      full_name: "Sample Student Name",
      student_number: "2021-00000",
    },
  ],
  attempts: sampleRows(6, (i) => ({
    id: `attempt-${i}`,
    student_id: "student",
    course_offering_id: `offering-${i}`,
  })),
  offerings: sampleRows(6, (i) => ({
    id: `offering-${i}`,
    course_id: `course-${i}`,
  })),
  courses: sampleRows(6, (i) => ({
    id: `course-${i}`,
    code: "CSCI 000",
    title: "Sample course title",
  })),
});

export const DASHBOARD_SKELETON_SAMPLE = layoutSample<
  Awaited<ReturnType<typeof getAdviserDashboard>>
>({
  adviser_id: "sample",
  total_advisees: 40,
  mean_gwa: null,
  advisees_with_deficiencies: [],
  grade_distribution: {
    total_graded: 300,
    inc_count: 4,
    dr_count: 2,
    na_count: 0,
    currently_enrolled_count: 40,
    buckets: sampleRows(5, (i) => ({
      label: "1.00–1.50",
      count: 100 - i * 15,
      percentage: 33 - i * 5,
    })),
  },
  batch_curriculum_gwa: sampleRows(5, (i) => ({
    entry_year: 2021 + (i % 4),
    program_id: "program",
    program_code: "BSCS",
    curriculum_version_id: "version",
    curriculum_label: "BSCS 2024",
    student_count: 10,
    mean_gwa: null,
    good_standing_count: 9,
  })),
});

export const TERM_OFFERINGS_SKELETON_SAMPLE = sampleRows(1, (i) =>
  layoutSample<Awaited<ReturnType<typeof getTermOfferings>>[number]>({
    offering: { id: `offering-${i}`, course_id: `course-${i}` },
    code: "CSCI 000",
    title: "Sample course title",
    has_unmet_strict_prerequisites: false,
  }),
);

export const STUDENT_HEADER_SKELETON_SAMPLE = layoutSample<
  Awaited<ReturnType<typeof getSelectedStudent>>
>({
  full_name: "Sample Student Name",
  student_number: "2021-00000",
  program_name: "Bachelor of Science in Sample Program",
  year_level: 3,
  email: "student@example.edu",
  standing: "good_standing",
  is_delinquent: false,
  open_flags_count: 0,
});
