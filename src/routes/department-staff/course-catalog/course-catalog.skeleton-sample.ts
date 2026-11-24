import { layoutSample, sampleRows } from "@/components/features/skeleton-sample";
import type { CatalogCourse } from "./course-catalog.api";

/** Layout-only course rows so the catalog table can be measured on first visit. */
export const COURSE_CATALOG_SKELETON_SAMPLE = {
  courses: sampleRows(10, (i) =>
    layoutSample<CatalogCourse>({
      id: `sample-${i}`,
      code: "CSCI 000",
      title: "Sample course title",
      units: 3,
      status: "active",
    }),
  ),
  total: 10,
};
