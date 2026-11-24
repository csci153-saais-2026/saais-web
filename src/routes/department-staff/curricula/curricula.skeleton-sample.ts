import {
  layoutSample,
  sampleRows,
} from "@/components/features/skeleton-sample";
import type {
  CurriculumSlot,
  CurriculumTerm,
  CurriculumVersion,
} from "./curricula.api";

/** Layout-only stand-ins so the curricula skeletons can be measured on first visit. */
export const CURRICULA_VERSIONS_SKELETON_SAMPLE = [
  layoutSample<CurriculumVersion>({
    id: "sample-version",
    version_label: "2024 Curriculum",
    total_units: 150,
    enrolled_student_count: 120,
    effective_start: "2024-08-01",
    status: "active",
  }),
];

export const CURRICULUM_DETAIL_SKELETON_SAMPLE = {
  terms: sampleRows(4, (t) =>
    layoutSample<CurriculumTerm>({
      id: `term-${t}`,
      year_level: 1 + Math.floor(t / 2),
      term_sequence: 1 + (t % 2),
    }),
  ),
  slots: sampleRows(4, (t) =>
    sampleRows(6, (i) =>
      layoutSample<CurriculumSlot>({
        id: `slot-${t}-${i}`,
        curriculum_term_id: `term-${t}`,
        slot_label: "CSCI 000 · Sample course title",
        slot_type: "fixed",
        nominal_units: 3,
        is_elective_slot: false,
      }),
    ),
  ).flat(),
  courses: [],
};
