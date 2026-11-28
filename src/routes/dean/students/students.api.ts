import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";
import {
  fetchAllPages,
  fetchRelatedRows,
  MAX_COLLECTION_OFFSET,
} from "@/routes/dean/shared/fetch-all-pages";

export async function getDeanStudents(
  signal?: AbortSignal,
  facultyId?: string,
): Promise<ApiSchema<"StudentRosterResponse">> {
  const items: ApiSchema<"StudentRosterItem">[] = [];

  for (let offset = 0; offset <= MAX_COLLECTION_OFFSET;) {
    const page = unwrapApiResult(
      await apiClient.GET("/functions/v1/students", {
        params: {
          query: {
            ...(facultyId ? { faculty_id: facultyId } : {}),
            limit: 100,
            offset,
          },
        },
        signal,
      }),
    );
    items.push(...page.items);
    if (items.length >= page.total_count) return { ...page, items };
    if (page.items.length === 0)
      throw new Error("The student directory returned an incomplete roster.");
    offset += page.items.length;
  }
  throw new Error("The student directory exceeds the maximum page offset.");
}

export async function getDeanStudentChecklist(
  studentId: string,
  signal?: AbortSignal,
): Promise<{
  results: ApiSchema<"ChecklistSlotResult">[];
  slots: ApiSchema<"CurriculumTermCourse">[];
  terms: ApiSchema<"CurriculumTerm">[];
  courses: ApiSchema<"Course">[];
}> {
  const results = await fetchAllPages(
    (limit, offset) =>
      apiClient.GET("/functions/v1/students/{student_id}/checklist", {
        params: {
          path: { student_id: studentId },
          query: { limit, offset },
        },
        signal,
      }),
    "Student checklist",
  );
  const slots = await fetchRelatedRows(
    results.map((result) => result.curriculum_term_course_id),
    (id, limit, offset) =>
      apiClient.GET("/rest/v1/curriculum_term_course", {
        params: { query: { id, order: "id.asc", limit, offset } },
        signal,
      }),
    "Curriculum slots",
  );
  const [terms, courses] = await Promise.all([
    fetchRelatedRows(
      slots.map((slot) => slot.curriculum_term_id),
      (id, limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_term", {
          params: { query: { id, order: "id.asc", limit, offset } },
          signal,
        }),
      "Curriculum terms",
    ),
    getDeanCourses(
      slots.flatMap((slot) => (slot.course_id ? [slot.course_id] : [])),
      signal,
    ),
  ]);
  return { results, slots, terms, courses };
}

export async function getDeanStudentGrades(
  studentId: string,
  signal?: AbortSignal,
): Promise<ApiSchema<"TermGrades">[]> {
  return fetchAllPages(
    (limit, offset) =>
      apiClient.GET("/functions/v1/students/{student_id}/grades", {
        params: { path: { student_id: studentId }, query: { limit, offset } },
        signal,
      }),
    "Student grades",
  );
}

export async function getDeanCourses(
  courseIds: readonly string[],
  signal?: AbortSignal,
): Promise<ApiSchema<"Course">[]> {
  return fetchRelatedRows(
    courseIds,
    (id, limit, offset) =>
      apiClient.GET("/rest/v1/course", {
        params: { query: { id, order: "id.asc", limit, offset } },
        signal,
      }),
    "Course catalog",
  );
}

export async function getDeanCourseOfferings(
  offeringIds: readonly string[],
  signal?: AbortSignal,
): Promise<ApiSchema<"CourseOffering">[]> {
  return fetchRelatedRows(
    offeringIds,
    (id, limit, offset) =>
      apiClient.GET("/rest/v1/course_offering", {
        params: { query: { id, order: "id.asc", limit, offset } },
        signal,
      }),
    "Course offerings",
  );
}
