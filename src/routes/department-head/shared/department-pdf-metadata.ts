import {
  apiClient,
  postgrestFilter,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";

/** Read the selected department's letterhead without guessing organizational data. */
export async function loadDepartmentPdfMetadata(
  departmentId: string | undefined,
  signal?: AbortSignal,
): Promise<ApiSchema<"Department"> | undefined> {
  if (!departmentId) return undefined;
  const rows = unwrapApiResult(
    await apiClient.GET("/rest/v1/department", {
      ...(signal ? { signal } : {}),
      params: {
        query: {
          id: postgrestFilter.eq(departmentId),
          select:
            "id,faculty_id,name,code,letterhead_prefix,letterhead_name,department_head_name,dean_name",
          limit: 1,
        },
      },
    }),
  );
  return rows.find((row) => row.id === departmentId);
}
