import { ApiClientError, apiClient, unwrapApiResult } from "@/lib/api";
import type { ApiSchema } from "@/lib/api";
import { readAllCourses } from "@/lib/api/catalog";
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
  const fetchOfferings = (limit: number, offset?: number) =>
    apiClient
      .GET("/functions/v1/students/{student_id}/course-offerings", {
        params: {
          path: { student_id: studentId },
          query: { school_term_id: termId, limit, offset },
        },
      })
      .then(unwrapApiResult);
  // Smaller pages, fetched in bounded batches, so a failed limit=1000 request
  // never leaves only the first page reachable.
  const fetchOfferingPages = async () => {
    const pageSize = 100;
    const maxPages = 10;
    const all: Awaited<ReturnType<typeof fetchOfferings>> = [];
    for (let page = 0; page < maxPages; page++) {
      const rows = await fetchOfferings(pageSize, page * pageSize);
      for (const row of rows)
        if (!all.some((item) => item.offering.id === row.offering.id))
          all.push(row);
      if (rows.length < pageSize) return all;
    }
    return all;
  };

  // Try with limit=1000 first. If the server returns 5xx (edge-function error),
  // page through limit=100 requests instead.  If those fail too
  // (F-01: backend bug for a specific term), re-throw so the UI can display the
  // "could not be completed" error panel rather than showing an empty course list.

  const [offerings, courses] = await Promise.all([
    fetchOfferings(1000).catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status >= 500) {
        return fetchOfferingPages();
      }
      throw error;
    }),
    readAllCourses(),
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
