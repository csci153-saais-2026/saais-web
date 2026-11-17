import { apiClient, parseContentRange, postgrestFilter, unwrapApiResult, type ApiSchema } from '@/lib/api'

const READ_LIMIT = 1000
const FILTER_BATCH_SIZE = 50

export type CatalogCourse = ApiSchema<'Course'>
export type CatalogDepartment = Pick<ApiSchema<'Department'>, 'id' | 'faculty_id' | 'code' | 'name'>
export type CatalogFaculty = Pick<ApiSchema<'Faculty'>, 'id' | 'code' | 'name'>

export interface CourseCatalogData {
  courses: CatalogCourse[]
  departments: CatalogDepartment[]
  faculties: CatalogFaculty[]
}

export async function createCatalogCourse(body: ApiSchema<'CourseInsert'>): Promise<CatalogCourse> {
  return unwrapApiResult<CatalogCourse>(await apiClient.POST('/functions/v1/catalog/course', { body }))
}

function completeRead<T>(
  result: { data?: T[]; error?: unknown; response: Response },
  resource: string,
): T[] {
  const rows = unwrapApiResult<T[]>(result)
  if (!Array.isArray(rows)) throw new Error(`${resource} returned invalid data.`)

  const range = parseContentRange(result.response.headers.get('Content-Range'))
  if (
    rows.length >= READ_LIMIT ||
    result.response.status === 206 ||
    (range?.total != null && range.total > rows.length)
  ) {
    throw new Error(`${resource} reached the ${READ_LIMIT}-row read limit. A complete catalog could not be loaded.`)
  }
  return rows
}

async function readDepartmentReferences(
  departmentIds: string[],
  signal?: AbortSignal,
): Promise<CatalogDepartment[]> {
  const departments: CatalogDepartment[] = []
  for (let start = 0; start < departmentIds.length; start += FILTER_BATCH_SIZE) {
    const ids = departmentIds.slice(start, start + FILTER_BATCH_SIZE)
    const rows = completeRead<CatalogDepartment>(await apiClient.GET('/rest/v1/department', {
      params: { query: {
        id: postgrestFilter.inList(ids),
        select: 'id,faculty_id,code,name',
        order: 'name.asc,id.asc',
        limit: READ_LIMIT,
        offset: 0,
      } },
      signal,
    }), 'Department references')
    departments.push(...rows.filter(row => ids.includes(row.id)))
  }
  return departments
}

async function readFacultyReferences(
  facultyIds: string[],
  signal?: AbortSignal,
): Promise<CatalogFaculty[]> {
  const faculties: CatalogFaculty[] = []
  for (let start = 0; start < facultyIds.length; start += FILTER_BATCH_SIZE) {
    const ids = facultyIds.slice(start, start + FILTER_BATCH_SIZE)
    const rows = completeRead<CatalogFaculty>(await apiClient.GET('/rest/v1/faculty', {
      params: { query: {
        id: postgrestFilter.inList(ids),
        select: 'id,code,name',
        order: 'name.asc,id.asc',
        limit: READ_LIMIT,
        offset: 0,
      } },
      signal,
    }), 'Faculty references')
    faculties.push(...rows.filter(row => ids.includes(row.id)))
  }
  return faculties
}

/** Reads the institution-reference catalog permitted to Department Staff, with references limited to visible course departments. */
export async function listCourseCatalog(signal?: AbortSignal): Promise<CourseCatalogData> {
  const courses = completeRead<CatalogCourse>(await apiClient.GET('/rest/v1/course', {
    params: { query: {
      select: 'id,department_id,code,title,units,category,status',
      order: 'code.asc,id.asc',
      limit: READ_LIMIT,
      offset: 0,
    } },
    signal,
  }), 'Course catalog')

  const departmentIds = [...new Set(courses.map(course => course.department_id).filter((id): id is string => Boolean(id)))]
  const departments = await readDepartmentReferences(departmentIds, signal)
  const facultyIds = [...new Set(departments.map(department => department.faculty_id).filter((id): id is string => Boolean(id)))]
  const faculties = await readFacultyReferences(facultyIds, signal)

  return { courses, departments, faculties }
}
