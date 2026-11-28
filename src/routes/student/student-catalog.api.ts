import { apiClient, postgrestFilter, unwrapApiResult } from "@/lib/api";

const MAX_IDS_PER_QUERY = 50;
type ReferenceId = string | null | undefined;
type ReferenceQuery = { id: string; limit: number; order: "id.asc" };

async function fetchReferencedRows<T>(
  ids: readonly ReferenceId[],
  fetchBatch: (
    query: ReferenceQuery,
  ) => Promise<{ data?: T[]; error?: unknown; response: Response }>,
): Promise<T[]> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const rows: T[] = [];
  for (let start = 0; start < uniqueIds.length; start += MAX_IDS_PER_QUERY) {
    const batch = uniqueIds.slice(start, start + MAX_IDS_PER_QUERY);
    const page = unwrapApiResult(
      await fetchBatch({
        id: postgrestFilter.inList(batch),
        limit: batch.length,
        order: "id.asc",
      }),
    );
    rows.push(...page);
  }
  return rows;
}

export function fetchStudentOfferings(ids: readonly ReferenceId[]) {
  return fetchReferencedRows(ids, (query) =>
    apiClient.GET("/rest/v1/course_offering", { params: { query } }),
  );
}

export function fetchStudentCourses(ids: readonly ReferenceId[]) {
  return fetchReferencedRows(ids, (query) =>
    apiClient.GET("/rest/v1/course", { params: { query } }),
  );
}

export function fetchStudentSchoolTerms(ids: readonly ReferenceId[]) {
  return fetchReferencedRows(ids, (query) =>
    apiClient.GET("/rest/v1/school_term", { params: { query } }),
  );
}

export function fetchStudentCurriculumSlots(ids: readonly ReferenceId[]) {
  return fetchReferencedRows(ids, (query) =>
    apiClient.GET("/rest/v1/curriculum_term_course", { params: { query } }),
  );
}
