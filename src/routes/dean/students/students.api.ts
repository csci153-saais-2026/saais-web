import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";
import { fetchAllPages } from "@/routes/dean/shared/fetch-all-pages";

export async function getDeanStudents(
  signal?: AbortSignal,
): Promise<ApiSchema<"StudentRosterResponse">> {
  const items: ApiSchema<"StudentRosterItem">[] = [];

  for (let offset = 0; ; offset += 100) {
    const page = unwrapApiResult(
      await apiClient.GET("/functions/v1/students", {
        params: { query: { limit: 100, offset } },
        signal,
      }),
    );
    items.push(...page.items);
    if (items.length >= page.total_count || page.items.length === 0) {
      return { ...page, items };
    }
  }
}

export async function getDeanStudentChecklist(studentId: string): Promise<{
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
      }),
    "Student checklist",
  );
  const [slots, terms, courses] = await Promise.all([
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_term_course", {
          params: { query: { limit, offset } },
        }),
      "Curriculum slots",
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/curriculum_term", {
          params: { query: { limit, offset } },
        }),
      "Curriculum terms",
    ),
    fetchAllPages(
      (limit, offset) =>
        apiClient.GET("/rest/v1/course", {
          params: { query: { limit, offset } },
        }),
      "Course catalog",
    ),
  ]);
  return { results, slots, terms, courses };
}

export async function getDeanStudentGrades(
  studentId: string,
): Promise<ApiSchema<"TermGrades">[]> {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/students/{student_id}/grades", {
      params: { path: { student_id: studentId } },
    }),
  );
}

export async function getDeanCourses(): Promise<ApiSchema<"Course">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/course"));
}

export async function getDeanCourseOfferings(): Promise<
  ApiSchema<"CourseOffering">[]
> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/course_offering"));
}
