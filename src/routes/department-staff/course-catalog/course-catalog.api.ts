import { apiClient, parseContentRange, postgrestFilter, unwrapApiResult, type ApiSchema, type OperationQuery } from '@/lib/api'

const READ_LIMIT = 1000
const PAGE_SIZE = 20
const MAX_OFFSET = 100_000

export type CatalogCourse = ApiSchema<'Course'>
export type CatalogDepartment = Pick<ApiSchema<'Department'>, 'id' | 'faculty_id' | 'code' | 'name'>
export type CatalogFaculty = Pick<ApiSchema<'Faculty'>, 'id' | 'code' | 'name'>

export interface CourseCatalogReferences {
  departments: CatalogDepartment[]
  faculties: CatalogFaculty[]
}

export interface CourseCatalogFilters {
  search: string
  status: '' | 'active' | 'inactive' | 'discontinued'
  facultyId: string
  departmentId: string
  page: number
}

export interface CourseCatalogPage {
  courses: CatalogCourse[]
  total: number | null
}

export async function createCatalogCourse(body: ApiSchema<'CourseInsert'>): Promise<CatalogCourse> {
  return unwrapApiResult<CatalogCourse>(await apiClient.POST('/functions/v1/catalog/course', { body }))
}

export async function updateCatalogCourse(id: string, body: ApiSchema<'CourseUpdate'>): Promise<CatalogCourse> {
  return unwrapApiResult<CatalogCourse>(await apiClient.PATCH('/functions/v1/catalog/course/{id}', {
    params: { path: { id } },
    body,
  }))
}

export async function deleteCatalogCourse(id: string): Promise<void> {
  unwrapApiResult(await apiClient.DELETE('/functions/v1/catalog/course/{id}', {
    params: { path: { id } },
  }))
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
    throw new Error(`${resource} reached the ${READ_LIMIT}-row read limit. A complete reference list could not be loaded.`)
  }
  return rows
}

/** Reads institution-reference rows permitted to Staff. These rows are display/filter data, never a write scope. */
export async function listCourseCatalogReferences(signal?: AbortSignal): Promise<CourseCatalogReferences> {
  const [departmentsResult, facultiesResult] = await Promise.all([
    apiClient.GET('/rest/v1/department', {
      params: { query: { select: 'id,faculty_id,code,name', order: 'name.asc,id.asc', limit: READ_LIMIT, offset: 0 } },
      signal,
    }),
    apiClient.GET('/rest/v1/faculty', {
      params: { query: { select: 'id,code,name', order: 'name.asc,id.asc', limit: READ_LIMIT, offset: 0 } },
      signal,
    }),
  ])
  return {
    departments: completeRead<CatalogDepartment>(departmentsResult, 'Department references'),
    faculties: completeRead<CatalogFaculty>(facultiesResult, 'Faculty references'),
  }
}

function searchFilter(search: string): string | undefined {
  const term = search.trim()
  if (!term) return undefined
  const hasControlCharacters = Array.from(term).some(character => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127
  })
  if (term.length > 100 || hasControlCharacters || /[%*_(),."\\]/.test(term)) {
    throw new TypeError('Search must be 100 characters or fewer and cannot contain wildcard or control characters.')
  }
  const pattern = postgrestFilter.ilike(`%${term}%`)
  return `(code.${pattern},title.${pattern})`
}

/** Reads one bounded catalog page using only the published listCourses filter operators. */
export async function listCourseCatalogPage(
  filters: CourseCatalogFilters,
  references: CourseCatalogReferences,
  signal?: AbortSignal,
): Promise<CourseCatalogPage> {
  const offset = filters.page * PAGE_SIZE
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    throw new RangeError('The requested catalog page is outside the supported range.')
  }

  const selectedDepartment = filters.departmentId
    ? references.departments.find(department => department.id === filters.departmentId)
    : undefined
  if (filters.departmentId && !selectedDepartment) return { courses: [], total: 0 }
  if (selectedDepartment && filters.facultyId && selectedDepartment.faculty_id !== filters.facultyId) {
    return { courses: [], total: 0 }
  }

  let departmentFilter: string | undefined
  if (selectedDepartment) {
    departmentFilter = postgrestFilter.eq(selectedDepartment.id)
  } else if (filters.facultyId) {
    const departmentIds = references.departments
      .filter(department => department.faculty_id === filters.facultyId)
      .map(department => department.id)
    if (departmentIds.length === 0) return { courses: [], total: 0 }
    departmentFilter = postgrestFilter.inList(departmentIds)
  }

  const query: OperationQuery<'listCourses'> = {
    select: 'id,department_id,code,title,units,category,status',
    order: 'code.asc,id.asc',
    limit: PAGE_SIZE,
    offset,
    ...(departmentFilter ? { department_id: departmentFilter } : {}),
    ...(filters.status ? { status: postgrestFilter.eq(filters.status) } : {}),
    ...(filters.search.trim() ? { or: searchFilter(filters.search) } : {}),
  }

  const result = await apiClient.GET('/rest/v1/course', { params: { query }, signal })
  const courses = unwrapApiResult<CatalogCourse[]>(result)
  if (!Array.isArray(courses)) throw new Error('Course catalog returned invalid data.')
  const range = parseContentRange(result.response.headers.get('Content-Range'))
  return { courses, total: range?.total ?? null }
}

export const courseCatalogPageSize = PAGE_SIZE
export const courseCatalogMaxOffset = MAX_OFFSET
