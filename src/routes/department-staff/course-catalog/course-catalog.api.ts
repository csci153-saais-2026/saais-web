import { apiClient, unwrapApiResult, type ApiSchema } from '@/lib/api'

export type CatalogCourse = ApiSchema<'Course'>

export async function createCatalogCourse(body: ApiSchema<'CourseInsert'>): Promise<CatalogCourse> {
  return unwrapApiResult<CatalogCourse>(await apiClient.POST('/functions/v1/catalog/course', { body }))
}
