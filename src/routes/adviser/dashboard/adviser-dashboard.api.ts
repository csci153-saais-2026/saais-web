import { apiClient, unwrapApiResult } from "@/lib/api";
import { readAllSchoolTerms } from "@/lib/api/catalog";

export async function getAdviserDashboard(schoolTermId?: string) {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/reports/adviser-dashboard", {
      params: { query: schoolTermId ? { school_term_id: schoolTermId } : {} },
    }),
  );
}

export async function getSchoolTerms() {
  const terms = await readAllSchoolTerms();
  return [...terms].sort((a, b) => b.chronological_key - a.chronological_key);
}
