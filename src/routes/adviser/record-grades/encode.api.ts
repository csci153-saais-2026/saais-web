import { ApiClientError, apiClient, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";
import { getRoster } from "../advisees/advisees.api";
import { getChecklist } from "../advisees/checklist/record.api";
export async function getEncodingChoices() {
  const [students, terms] = await Promise.all([
    getRoster("current"),
    apiClient
      .GET("/rest/v1/school_term", { params: { query: { limit: 1000 } } })
      .then(unwrapApiResult),
  ]);
  return { students, terms };
}
export async function getTermOfferings(studentId: string, termId: string) {
  const fetchOfferings = (limit: number) =>
    apiClient
      .GET("/functions/v1/students/{student_id}/course-offerings", {
        params: {
          path: { student_id: studentId },
          query: { school_term_id: termId, limit },
        },
      })
      .then(unwrapApiResult);

  // Try with limit=1000 first. If the server returns 5xx (edge-function error),
  // fall back to limit=100 so a partial list is still usable.  If both fail
  // (F-01: backend bug for a specific term), re-throw so the UI can display the
  // "could not be completed" error panel rather than showing an empty course list.

  const [offerings, courses] = await Promise.all([
    fetchOfferings(1000).catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status >= 500) {
        return fetchOfferings(100);
      }
      throw error;
    }),
    apiClient
      .GET("/rest/v1/course", {
        params: { query: { select: "id,is_elective", limit: 1000 } },
      })
      .then(unwrapApiResult),
  ]);
  const electiveIds = new Set(
    courses.filter((course) => course.is_elective).map((course) => course.id),
  );
  return offerings.map((option) => ({
    ...option,
    is_elective: electiveIds.has(option.offering.course_id),
  }));
}
export async function getElectiveSlots(studentId: string) {
  const { results, slots } = await getChecklist(studentId);
  return slots
    .filter((slot) => slot.is_elective_slot)
    .map((slot) => ({
      id: slot.id,
      label: slot.slot_label ?? "Elective",
      used:
        results.find((row) => row.curriculum_term_course_id === slot.id)
          ?.status !== "not_taken",
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
}
export async function saveTermGrades(
  studentId: string,
  termId: string,
  rows: ApiSchema<"EncodeTermGradeRowInput">[],
) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/students/{student_id}/encode-grades", {
      params: { path: { student_id: studentId } },
      body: { school_term_id: termId, rows },
    }),
  );
}
