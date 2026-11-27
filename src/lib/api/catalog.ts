import { apiClient, unwrapApiResult } from "@/lib/api";

/**
 * Complete reads of shared catalog tables. The Data API gateway returns only 20
 * rows when a request has no `limit`, so every page is requested explicitly.
 */
const PAGE_SIZE = 1000;

type PageQuery = { order: string; limit: number; offset: number };

async function readAll<T>(
  fetchPage: (
    query: PageQuery,
  ) => Promise<{ data?: T[]; error?: unknown; response: Response }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    // A stable order keeps offset pages from overlapping.
    const page = unwrapApiResult(
      await fetchPage({ order: "id.asc", limit: PAGE_SIZE, offset }),
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export const readAllCourses = () =>
  readAll((query) => apiClient.GET("/rest/v1/course", { params: { query } }));

export const readAllCourseOfferings = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/course_offering", { params: { query } }),
  );

export const readAllSchoolTerms = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/school_term", { params: { query } }),
  );

export const readAllPrograms = () =>
  readAll((query) => apiClient.GET("/rest/v1/program", { params: { query } }));

export const readAllCurriculumVersions = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/curriculum_version", { params: { query } }),
  );

export const readAllDepartments = (signal?: AbortSignal) =>
  readAll((query) =>
    apiClient.GET("/rest/v1/department", { params: { query }, signal }),
  );

export const readAllFaculties = (signal?: AbortSignal) =>
  readAll((query) =>
    apiClient.GET("/rest/v1/faculty", { params: { query }, signal }),
  );

export const readAllCurriculumTerms = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/curriculum_term", { params: { query } }),
  );

export const readAllCurriculumTermCourses = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/curriculum_term_course", { params: { query } }),
  );

export const readAllCurriculumTransferRequests = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/curriculum_transfer_request", {
      params: { query },
    }),
  );

export const readAllCurriculumPairEquivalences = () =>
  readAll((query) =>
    apiClient.GET("/rest/v1/curriculum_pair_equivalence", {
      params: { query },
    }),
  );
