import {
  apiClient,
  parseContentRange,
  postgrestFilter,
  unwrapApiResult,
} from "@/lib/api";
import type { ApiSchema } from "@/lib/api";

const READ_LIMIT = 1000;

export type SchoolTerm = ApiSchema<"SchoolTerm">;
export type DepartmentTermEncoding = ApiSchema<"DepartmentTermEncodingClosure">;
export type SchoolTermInsert = ApiSchema<"SchoolTermInsert">;
export type SchoolTermUpdate = Omit<ApiSchema<"SchoolTermUpdate">, "is_locked">;
export type SchoolTermCloseEncodingRequest =
  ApiSchema<"SchoolTermCloseEncodingRequest">;

export interface AcademicTermsData {
  readonly terms: readonly SchoolTerm[];
  readonly departmentClosures: readonly DepartmentTermEncoding[];
}

export async function createSchoolTerm(
  body: SchoolTermInsert,
): Promise<SchoolTerm> {
  return unwrapApiResult<SchoolTerm>(
    await apiClient.POST("/functions/v1/catalog/school_term", { body }),
  );
}

export async function updateSchoolTerm(
  id: string,
  body: SchoolTermUpdate,
): Promise<SchoolTerm> {
  return unwrapApiResult<SchoolTerm>(
    await apiClient.PATCH("/functions/v1/catalog/school_term/{id}", {
      params: { path: { id } },
      body,
    }),
  );
}

export async function closeSchoolTermEncoding(
  schoolTermId: string,
  body: SchoolTermCloseEncodingRequest,
): Promise<SchoolTerm> {
  return unwrapApiResult<SchoolTerm>(
    await apiClient.POST(
      "/functions/v1/school-terms/{school_term_id}/close-encoding",
      {
        params: { path: { school_term_id: schoolTermId } },
        body,
      },
    ),
  );
}

export async function reopenDepartmentTermEncoding(
  schoolTermId: string,
  body: SchoolTermCloseEncodingRequest,
): Promise<DepartmentTermEncoding> {
  return unwrapApiResult<DepartmentTermEncoding>(
    await apiClient.POST(
      "/functions/v1/school-terms/{school_term_id}/reopen-encoding",
      {
        params: { path: { school_term_id: schoolTermId } },
        body,
      },
    ),
  );
}

function completeRead<T>(
  result: { data?: T[]; error?: unknown; response: Response },
  resource: string,
): T[] {
  const rows = unwrapApiResult<T[]>(result);
  if (!Array.isArray(rows)) {
    throw new Error(`${resource} returned invalid data.`);
  }

  const range = parseContentRange(result.response.headers.get("Content-Range"));
  if (
    rows.length >= READ_LIMIT ||
    result.response.status === 206 ||
    (range?.total != null && range.total > rows.length)
  ) {
    throw new Error(
      `${resource} reached the ${READ_LIMIT}-row read limit. A complete term history could not be loaded.`,
    );
  }

  return rows;
}

export async function listAcademicTerms(
  departmentId: string,
  signal?: AbortSignal,
): Promise<AcademicTermsData> {
  const [termResult, closureResult] = await Promise.all([
    apiClient.GET("/rest/v1/school_term", {
      params: {
        query: {
          select:
            "id,start_year,end_year,term_type,school_year,is_locked,starts_on,ends_on,encoding_deadline,default_inc_deadline,closed_by,closed_by_name,closed_at,closure_note,chronological_key",
          order: "chronological_key.desc,id.asc",
          limit: READ_LIMIT,
          offset: 0,
        },
      },
      signal,
    }),
    apiClient.GET("/rest/v1/department_term_encoding", {
      params: {
        query: {
          department_id: postgrestFilter.eq(departmentId),
          select:
            "id,school_term_id,department_id,is_closed,closed_by,closed_by_name,closed_at,closure_note,updated_at",
          order: "school_term_id.asc,id.asc",
          limit: READ_LIMIT,
          offset: 0,
        },
      },
      signal,
    }),
  ]);

  const terms = completeRead<SchoolTerm>(termResult, "School terms");
  const departmentClosures = completeRead<DepartmentTermEncoding>(
    closureResult,
    "Department term encodings",
  ).filter((closure) => closure.department_id === departmentId);

  const seenTermIds = new Set<string>();
  for (const closure of departmentClosures) {
    if (seenTermIds.has(closure.school_term_id)) {
      throw new Error(
        "The department term encoding service returned multiple closure states for one term.",
      );
    }
    seenTermIds.add(closure.school_term_id);
  }

  return { terms, departmentClosures };
}
