import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";

export async function getDeanFaculties(
  signal?: AbortSignal,
): Promise<ApiSchema<"Faculty">[]> {
  return unwrapApiResult(await apiClient.GET("/rest/v1/faculty", { signal }));
}

export function resolveDeanFaculty(
  faculties: readonly ApiSchema<"Faculty">[],
  options?: {
    facultyId?: string | null;
    deanName?: string | null;
  },
): ApiSchema<"Faculty"> | null {
  const namedFaculties = faculties.filter(
    (faculty) => faculty.name.trim().length > 0,
  );
  if (namedFaculties.length === 0) return null;

  if (options?.facultyId) {
    return (
      namedFaculties.find((faculty) => faculty.id === options.facultyId) ?? null
    );
  }

  if (options?.deanName) {
    const normalizedDean = options.deanName.trim().toLowerCase();
    const matchedByDean = namedFaculties.find(
      (faculty) => faculty.dean_name?.trim().toLowerCase() === normalizedDean,
    );
    if (matchedByDean) return matchedByDean;
    return null;
  }

  return namedFaculties[0] ?? null;
}
