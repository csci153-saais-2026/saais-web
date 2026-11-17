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
  status: '' | 'active' | 'inactive'
  facultyId: string
  departmentId: string
  page: number
}

export interface CourseCatalogPage {
  courses: CatalogCourse[]
  total: number | null
}

export type CatalogPrerequisiteType = 'strict' | 'co_requisite' | 'recommended'

export interface CatalogPrerequisiteView {
  id: string
  prerequisiteCourseId: string
  type: CatalogPrerequisiteType
  course: CatalogCourse | null
}

export async function createCatalogPrerequisite(body: ApiSchema<'PrerequisiteInsert'>): Promise<ApiSchema<'Prerequisite'>> {
  return unwrapApiResult<ApiSchema<'Prerequisite'>>(await apiClient.POST('/functions/v1/catalog/prerequisite', { body }))
}

export async function deleteCatalogPrerequisite(id: string): Promise<void> {
  unwrapApiResult(await apiClient.DELETE('/functions/v1/catalog/prerequisite/{id}', { params: { path: { id } } }))
}

/** Reads a bounded set of candidate courses only from the administering department. */
export async function listDepartmentPrerequisiteCandidates(departmentId: string, signal?: AbortSignal): Promise<CatalogCourse[]> {
  const result = await apiClient.GET('/rest/v1/course', {
    params: { query: {
      department_id: postgrestFilter.eq(departmentId),
      select: 'id,department_id,code,title,units,status,repeatable_type,is_elective,category',
      order: 'code.asc,id.asc',
      limit: READ_LIMIT,
      offset: 0,
    } },
    signal,
  })
  return completeRead<CatalogCourse>(result, 'Department course references')
    .filter(course => course.department_id === departmentId)
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

/** Reads one course's prerequisite rows, then resolves only their referenced course IDs. */
export async function listCatalogPrerequisites(courseId: string, signal?: AbortSignal): Promise<CatalogPrerequisiteView[]> {
  const relationshipsResult = await apiClient.GET('/rest/v1/prerequisite', {
    params: { query: {
      course_id: postgrestFilter.eq(courseId),
      select: 'id,course_id,prerequisite_course_id,type',
      order: 'type.asc,id.asc',
      limit: READ_LIMIT,
      offset: 0,
    } },
    signal,
  })
  const relationships = completeRead<ApiSchema<'Prerequisite'>>(relationshipsResult, 'Course prerequisites')
    .filter(row => row.course_id === courseId)
  const validRelationships = relationships.filter((row): row is ApiSchema<'Prerequisite'> & { type: CatalogPrerequisiteType } =>
    row.type === 'strict' || row.type === 'co_requisite' || row.type === 'recommended',
  )
  const courseIds = [...new Set(validRelationships
    .map(row => row.prerequisite_course_id)
    .filter(id => typeof id === 'string' && id.length > 0))]
  if (!courseIds.length) return validRelationships.map(row => ({ id: row.id, prerequisiteCourseId: row.prerequisite_course_id, type: row.type, course: null }))

  const coursesResult = await apiClient.GET('/rest/v1/course', {
    params: { query: {
      id: postgrestFilter.inList(courseIds),
      select: 'id,department_id,code,title,units,status,repeatable_type,is_elective,category',
      order: 'code.asc,id.asc',
      limit: READ_LIMIT,
      offset: 0,
    } },
    signal,
  })
  const courses = completeRead<CatalogCourse>(coursesResult, 'Prerequisite course references')
  const coursesById = new Map(courses.map(course => [course.id, course]))
  return validRelationships.map(row => ({
    id: row.id,
    prerequisiteCourseId: row.prerequisite_course_id,
    type: row.type,
    course: coursesById.get(row.prerequisite_course_id) ?? null,
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
    ...(filters.status
      ? { status: filters.status === 'active' ? postgrestFilter.eq('active') : postgrestFilter.neq('active') }
      : {}),
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
