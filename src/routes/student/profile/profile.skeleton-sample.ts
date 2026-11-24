import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type { StudentProfileData } from "./student-profile.api";

/** Layout-only stand-in so the profile skeleton can be measured on first visit. */
export const PROFILE_SKELETON_SAMPLE = layoutSample<StudentProfileData>({
  profile: {
    id: "sample",
    role: "student",
    email: "student@example.edu",
    full_name: "Sample Student Name",
    student_number: "2021-00000",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    avatar_url: null,
  },
  programName: "Bachelor of Science in Sample Program",
  departmentName: "Department of Sample Studies",
  collegeName: "Faculty of Sample Sciences",
  adviserAssignments: sampleRows(2, (i) => ({
    id: `a${i}`,
    adviser_id: "adviser",
    adviser_name: "Sample Adviser Name",
    adviser_email: "adviser@example.edu",
    start_date: "2025-08-01",
    end_date: i === 0 ? null : "2025-05-30",
  })),
  curriculumAssignments: sampleRows(1, (i) => ({
    id: `c${i}`,
    student_id: "sample",
    curriculum_version_id: "v",
    start_date: "2021-08-01",
    end_date: null,
  })),
  curriculumTransfers: [],
  curriculumLabels: { v: "2024 Curriculum" },
});
