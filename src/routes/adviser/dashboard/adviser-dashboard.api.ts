import { apiClient, unwrapApiResult } from '@/lib/api'

export async function getAdviserDashboard(schoolTermId?: string) {
  return unwrapApiResult(await apiClient.GET('/functions/v1/reports/adviser-dashboard', {
    params: { query: schoolTermId ? { school_term_id: schoolTermId } : {} },
  }))
}

export async function getSchoolTerms() {
  return unwrapApiResult(await apiClient.GET('/rest/v1/school_term'))
}
